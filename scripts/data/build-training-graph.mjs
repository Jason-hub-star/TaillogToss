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

// 증상 → 대표 진입 노드
//
// 휴리스틱으로 고르지 않는다. tailtree 실코퍼스(ke1-v2-run.v0.json)에서
// **사람이 판정한** entry_node 를 증상별로 집계해 최빈값을 쓴다.
//
// 왜 휴리스틱이 안 되나(2026-08-18 실측): "사다리가 가장 긴 노드"를 목표로 잡으면
// leash_pulling -> skill.rally.off_leash_heel(줄 당김 문제에 목줄 제거 훈련),
// aggression -> skill.emotional.muzzle_conditioning(입마개 = 낙인) 처럼
// 보호자에게 최종 보스를 던지는 결과가 나온다.
const corpus = (() => {
  try {
    return JSON.parse(readFileSync(join(TT, 'data/ke1-v2-run.v0.json'), 'utf-8')).items;
  } catch {
    return [];
  }
})();

const entryVotes = new Map(); // symptom -> Map(nodeId -> count)
for (const item of corpus) {
  const raw = item.entry_node;
  if (!raw) continue;
  const atom = fold(raw);
  if (!exposed.has(atom)) continue;
  for (const s of symIndex[raw] ?? symIndex[atom] ?? []) {
    if (!entryVotes.has(s)) entryVotes.set(s, new Map());
    const m = entryVotes.get(s);
    m.set(atom, (m.get(atom) ?? 0) + 1);
  }
}

// 코퍼스에 사람 판정이 없는 증상만 명시 보완한다. 추론 규칙을 만들지 않는다 —
// 3개뿐이고, 근거를 적어두는 편이 규칙을 세우는 것보다 정직하다.
const ENTRY_FALLBACK = {
  jumping: 'skill.self_regulation.four_paws', // 네 발 바닥 = 뛰어오름 대응의 표준 첫 수
  resource_guarding: 'skill.self_regulation.impulse_trade', // 교환 훈련이 자원 보호의 표준
};

// 3순위: 그 증상에 태깅된 노드 중 **사다리가 가장 짧은** 것(진입 장벽 최소).
// 안전 민감 증상에는 쓰지 않는다 — 위에서 코퍼스나 명시 매핑으로 이미 덮인다.
// tricks 처럼 스포츠 축에서만 걸리며, 거기선 "가장 쉬운 것부터"가 옳다.
const prereqOf = new Map();
for (const e of slimEdges) {
  const list = prereqOf.get(e.t);
  if (list) list.push(e.f);
  else prereqOf.set(e.t, [e.f]);
}
const ladderSize = (id) => {
  const seen = new Set([id]);
  const stack = [id];
  while (stack.length > 0) {
    const cur = stack.pop();
    for (const p of prereqOf.get(cur) ?? []) {
      if (!seen.has(p)) {
        seen.add(p);
        stack.push(p);
      }
    }
  }
  return seen.size;
};

const symptomEntry = {};
const entrySource = {};
for (const s of symptoms) {
  const votes = entryVotes.get(s.id);
  if (votes && votes.size > 0) {
    const [top] = [...votes.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    symptomEntry[s.id] = top[0];
    entrySource[s.id] = `corpus(${top[1]})`;
    continue;
  }
  if (ENTRY_FALLBACK[s.id] && exposed.has(ENTRY_FALLBACK[s.id])) {
    symptomEntry[s.id] = ENTRY_FALLBACK[s.id];
    entrySource[s.id] = 'fallback';
    continue;
  }
  const tagged = Object.entries(slimIndex)
    .filter(([, syms]) => syms.includes(s.id))
    .map(([id]) => id);
  if (tagged.length > 0) {
    const easiest = tagged.reduce((a, b) => (ladderSize(b) < ladderSize(a) ? b : a));
    symptomEntry[s.id] = easiest;
    entrySource[s.id] = `shortest-ladder(${ladderSize(easiest)})`;
  }
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
    symptomEntry: Object.keys(symptomEntry).length,
    entryFromCorpus: Object.values(entrySource).filter((v) => v.startsWith('corpus')).length,
  },
  symptoms,
  nodes: slimNodes,
  edges: slimEdges,
  how: slimHow,
  symptomIndex: slimIndex,
  symptomEntry,
  $entrySource: entrySource,
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
console.log(`  진입노드  ${payload.counts.symptomEntry}/${payload.counts.symptoms}  (코퍼스 사람판정 ${payload.counts.entryFromCorpus} · 명시보완 ${payload.counts.symptomEntry - payload.counts.entryFromCorpus})`);
console.log(`  크기      ${kb(Buffer.byteLength(json))}  ->  ${OUT}`);
console.log('  비교      현행 curriculum.ts 64 KB · 토스 .ait 제한 100 MB\n');
