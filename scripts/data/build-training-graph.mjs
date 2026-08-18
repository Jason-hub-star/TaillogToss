#!/usr/bin/env node
/**
 * tailtree taxonomy → TaillogToss 번들 페이로드 빌더
 *
 * 3차 수렴 P11 #2·#6 구현:
 *   #2 노출 부분그래프를 앱 번들에 적재(서버 아님) — 오프라인 유지(감사 A4)
 *   #6 빌드타임 필터 — how[].authored === 'reviewed' 통과분만 넣는다.
 *      런타임 게이트 코드가 없다. 미검수 콘텐츠는 애초에 번들에 안 들어간다(감사 A2)
 *
 * 손으로 복사하지 않는다. tailtree 가 갱신되면 이 스크립트를 다시 돌린다.
 *   node scripts/data/build-training-graph.mjs [--tailtree <path>] [--check]
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { execSync } from 'node:child_process';

const argv = process.argv.slice(2);
const CHECK = argv.includes('--check');
const TT = argv.indexOf('--tailtree') >= 0 ? argv[argv.indexOf('--tailtree') + 1] : '/Users/family/jason/tailtree';
const TAX = join(TT, 'data/taxonomy');
const OUT = 'src/lib/data/graph/training-graph.json';

const read = (f) => JSON.parse(readFileSync(join(TAX, f), 'utf-8'));
const nodes = read('nodes.json').nodes;
const edges = read('edges.json').edges;
const how = read('how.json').entries;
const symptoms = read('symptoms.json').symptoms;
const symIndex = read('symptom-index.json').index;
const manifest = read('manifest.json');

const isStep = (id) => /\.s\d+$/.test(id);
const fold = (id) => id.replace(/\.s\d+$/, '');

// 빌드타임 필터 (P11 #6)
// 노출 대상 = 스텝이 아닌 원자 AND how 보유 AND how.authored === 'reviewed'
const REVIEWED = 'reviewed';
const exposed = new Set(
  nodes
    .filter((n) => !isStep(n.id))
    .filter((n) => how[n.id] && how[n.id].authored === REVIEWED)
    .map((n) => n.id),
);
const rejected = nodes.filter((n) => !isStep(n.id) && how[n.id] && how[n.id].authored !== REVIEWED).length;

// 노드 슬림화 (evidence 는 제외 — 44KB 이고 현재 소비처가 없다)
const KEEP = ['id', 'label', 'type', 'col', 'age', 'mastery', 'assessmentPrompt', 'cgc', 'secondary'];
const byId = new Map(nodes.map((n) => [n.id, n]));
const slimNodes = [...exposed].sort().map((id) => {
  const n = byId.get(id);
  const o = {};
  for (const k of KEEP) {
    const v = n[k];
    if (v === undefined) continue;
    if (Array.isArray(v) && v.length === 0) continue;
    o[k] = v;
  }
  return o;
});

// 유도 엣지 (노출 원자 사이만, 스텝은 원자로 접는다)
const edgeSet = new Set();
for (const e of edges) {
  const f = fold(e.from);
  const t = fold(e.to);
  if (f !== t && exposed.has(f) && exposed.has(t)) edgeSet.add(f + '>' + t);
}
const slimEdges = [...edgeSet].sort().map((s) => {
  const [f, t] = s.split('>');
  return { f, t };
});

// how / 증상 인덱스도 노출분만
const slimHow = {};
for (const id of [...exposed].sort()) {
  const h = how[id];
  slimHow[id] = { oneline: h.oneline, steps: h.steps };
  if (h.stuck && h.stuck.length) slimHow[id].stuck = h.stuck;
}
const slimIndex = {};
for (const [nodeId, syms] of Object.entries(symIndex)) {
  const a = fold(nodeId);
  if (!exposed.has(a)) continue;
  slimIndex[a] = [...new Set([...(slimIndex[a] || []), ...syms])];
}

// 출처 각인
let ttCommit = 'unknown';
try {
  ttCommit = execSync('git rev-parse --short HEAD', { cwd: TT }).toString().trim();
} catch {
  /* tailtree 가 git 이 아니어도 빌드는 계속한다 */
}

const payload = {
  $source: {
    repo: 'tailtree',
    commit: ttCommit,
    taxonomyVersion: manifest.version,
    filter: "how.authored === 'reviewed'",
    note: '빌드 산출물이다. 직접 수정하지 말고 scripts/data/build-training-graph.mjs 를 다시 돌린다.',
  },
  counts: {
    nodes: slimNodes.length,
    edges: slimEdges.length,
    how: Object.keys(slimHow).length,
    symptoms: symptoms.length,
    rejectedByFilter: rejected,
  },
  symptoms,
  nodes: slimNodes,
  edges: slimEdges,
  how: slimHow,
  symptomIndex: slimIndex,
};

const json = JSON.stringify(payload, null, 1);

if (CHECK) {
  let cur = null;
  try {
    cur = readFileSync(OUT, 'utf-8');
  } catch {
    /* 아직 없음 */
  }
  if (cur !== json) {
    console.error(`STALE: ${OUT} 가 tailtree 최신과 다르다. 재빌드 필요.`);
    process.exit(2);
  }
  console.log('training-graph.json 최신 상태.');
  process.exit(0);
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, json);

const kb = (n) => `${(n / 1024).toFixed(0)} KB`;
console.log('\n훈련 그래프 번들 빌드\n');
console.log(`  출처      tailtree ${ttCommit} · taxonomy ${manifest.version}`);
console.log(`  필터      how.authored === 'reviewed'  (거른 노드 ${rejected}개)`);
console.log(`  노드      ${payload.counts.nodes}`);
console.log(`  엣지      ${payload.counts.edges}`);
console.log(`  how       ${payload.counts.how}`);
console.log(`  증상      ${payload.counts.symptoms}`);
console.log(`  크기      ${kb(Buffer.byteLength(json))}  ->  ${OUT}`);
console.log('  비교      현행 curriculum.ts 64 KB · 토스 .ait 제한 100 MB\n');
