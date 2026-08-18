#!/usr/bin/env node
/**
 * KE-T2 — 커리큘럼 진행률을 그래프 좌표로 잃지 않고 옮길 수 있는가
 * 계약: docs/goals/GOAL-ke-t2-progress-absorption.md (임계는 실행 전 봉인)
 *
 * 읽기 전용.  node scripts/ke/ke-t2-progress-absorption.mjs [--gate] [--tailtree <path>]
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';

const argv = process.argv.slice(2);
const GATE = argv.includes('--gate');
const TT = argv.indexOf('--tailtree') >= 0 ? argv[argv.indexOf('--tailtree') + 1] : '/Users/family/jason/tailtree';
const TAX = join(TT, 'data/taxonomy');
const read = (f) => JSON.parse(readFileSync(join(TAX, f), 'utf-8'));

// ── 봉인 임계 (GOAL §1, 실행 전 확정) ───────────────────────
const T_MIN_SIM = 0.10;   // 이 미만이면 매핑 실패
const T_MAX_DRIFT = 0.10; // 진행률 최대 절대편차 10%p

const CURRICULUM_SRC = 'src/lib/data/published/v2026-03-02-auto-080532/curriculum.ts';

// ── 구 좌표: curriculum.ts 에서 step() 호출 추출 ────────────
const src = readFileSync(CURRICULUM_SRC, 'utf-8');
// 지시문은 작은따옴표·큰따옴표를 혼용한다(leash_manners 는 ', separation_anxiety 는 ").
const stepRe = /step\(\s*'([a-z_]+)'\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(["'])((?:[^\\]|\\.)*?)\4/g;
const oldSteps = [];
for (let m; (m = stepRe.exec(src)); ) {
  oldSteps.push({
    curriculum: m[1], day: +m[2], order: +m[3],
    text: m[5].replace(/\\(["'])/g, '$1').replace(/\\n/g, ' '),
  });
}

// ── 신 좌표: tailtree 그래프 ────────────────────────────────
const nodes = read('nodes.json').nodes;
const edges = read('edges.json').edges;
const how = read('how.json').entries;
const symIndex = read('symptom-index.json').index;

const fold = (id) => id.replace(/\.s\d+$/, '');
const byId = new Map(nodes.map((n) => [n.id, n]));
const hasHow = (id) => Object.prototype.hasOwnProperty.call(how, id);

const prereqs = new Map();
for (const e of edges) {
  const to = fold(e.to), from = fold(e.from);
  if (to === from) continue;
  if (!prereqs.has(to)) prereqs.set(to, []);
  if (!prereqs.get(to).includes(from)) prereqs.get(to).push(from);
}
const symptomNodes = new Map();
for (const [nodeId, syms] of Object.entries(symIndex)) {
  for (const s of syms) {
    if (!symptomNodes.has(s)) symptomNodes.set(s, []);
    symptomNodes.get(s).push(fold(nodeId));
  }
}
function ladder(goal) {
  const set = new Set([goal]); const stack = [goal];
  while (stack.length) {
    const cur = stack.pop();
    for (const p of prereqs.get(cur) || []) if (!set.has(p)) { set.add(p); stack.push(p); }
  }
  const depth = new Map(); const visiting = new Set();
  const d = (id) => {
    if (depth.has(id)) return depth.get(id);
    if (visiting.has(id)) return 0;
    visiting.add(id);
    let m = 0;
    for (const p of prereqs.get(id) || []) if (set.has(p)) m = Math.max(m, d(p) + 1);
    visiting.delete(id); depth.set(id, m); return m;
  };
  return [...set].sort((a, b) => d(a) - d(b) || a.localeCompare(b));
}

// 커리큘럼 → 증상 → goal (KE-T1 과 동일 매핑)
const BEHAVIOR_TO_SYMPTOM = {
  separation: 'alone', anxiety: 'fearful', barking: 'barking', destructive: 'destructive',
  reactivity: 'dog_greeting', aggression: 'biting', resource_guarding: 'resource_guarding',
  leash_pulling: 'leash_pulling', jumping: 'jumping', other: 'cues',
};
const BEHAVIOR_TO_CURRICULUM = {
  separation: 'separation_anxiety', anxiety: 'fear_desensitization', barking: 'reactivity_management',
  destructive: 'impulse_control', reactivity: 'reactivity_management', aggression: 'socialization',
  resource_guarding: 'impulse_control', leash_pulling: 'leash_manners', jumping: 'basic_obedience',
  other: 'basic_obedience',
};
const currToSymptom = {};
for (const [b, c] of Object.entries(BEHAVIOR_TO_CURRICULUM)) if (!currToSymptom[c]) currToSymptom[c] = BEHAVIOR_TO_SYMPTOM[b];

/** 커리큘럼 → 신 스텝 시퀀스 [{atom, idx, text}] */
function newSequence(curriculumId) {
  const symptom = currToSymptom[curriculumId];
  const cands = [...new Set(symptomNodes.get(symptom) || [])];
  if (!cands.length) return null;
  const pool = cands.filter(hasHow).length ? cands.filter(hasHow) : cands;
  const goal = pool.reduce((a, b) => ((byId.get(b)?.col ?? 0) > (byId.get(a)?.col ?? 0) ? b : a));
  const seq = [];
  for (const atom of ladder(goal)) {
    const h = how[atom];
    if (!h) continue;
    (h.steps || []).forEach((t, i) => seq.push({ atom, idx: i, text: String(t) }));
  }
  return { goal, symptom, seq };
}

// ── 한글 문자 bigram Jaccard ────────────────────────────────
const norm = (s) => s.replace(/\{\{name\}\}/g, '').replace(/[^가-힣0-9]/g, '');
function bigrams(s) {
  const t = norm(s); const out = new Set();
  for (let i = 0; i + 1 < t.length; i++) out.add(t.slice(i, i + 2));
  return out;
}
function jaccard(a, b) {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

// ── 매핑 ────────────────────────────────────────────────────
const byCurr = new Map();
for (const s of oldSteps) {
  if (!byCurr.has(s.curriculum)) byCurr.set(s.curriculum, []);
  byCurr.get(s.curriculum).push(s);
}

const rows = []; const perCurr = [];
for (const [cid, steps] of [...byCurr.entries()].sort()) {
  const ns = newSequence(cid);
  if (!ns) { perCurr.push({ curriculum: cid, error: '증상 매핑 없음' }); continue; }
  const nbg = ns.seq.map((x) => bigrams(x.text));
  const total = steps.length;
  let worstDrift = 0, minSim = 1, fails = 0;
  const mapped = [];
  steps.sort((a, b) => a.day - b.day || a.order - b.order);
  steps.forEach((s, i) => {
    const sb = bigrams(s.text);
    let best = -1, bestSim = 0;
    nbg.forEach((b, j) => { const v = jaccard(sb, b); if (v > bestSim) { bestSim = v; best = j; } });
    const oldPos = (i + 1) / total;
    const newPos = best >= 0 ? (best + 1) / ns.seq.length : 0;
    const drift = Math.abs(newPos - oldPos);
    if (bestSim < T_MIN_SIM) fails++;
    if (bestSim < minSim) minSim = bestSim;
    if (drift > worstDrift) worstDrift = drift;
    mapped.push({
      old: `${s.curriculum}_d${s.day}_s${s.order}`, oldText: s.text.slice(0, 60),
      newAtom: best >= 0 ? ns.seq[best].atom : null, newIdx: best >= 0 ? ns.seq[best].idx : null,
      sim: +bestSim.toFixed(3), oldPos: +oldPos.toFixed(3), newPos: +newPos.toFixed(3), drift: +drift.toFixed(3),
    });
  });
  perCurr.push({
    curriculum: cid, goal: ns.goal, symptom: ns.symptom,
    oldSteps: total, newSteps: ns.seq.length,
    fails, minSim: +minSim.toFixed(3), worstDrift: +worstDrift.toFixed(3),
  });
  rows.push(...mapped);
}

const ok = perCurr.filter((c) => !c.error);
const totalFails = ok.reduce((a, c) => a + c.fails, 0);
const maxDrift = Math.max(...ok.map((c) => c.worstDrift), 0);
const globalMinSim = ok.length ? Math.min(...ok.map((c) => c.minSim)) : 0;

const checks = {
  a_mappingFailures: { value: totalFails, threshold: 0, pass: totalFails === 0 },
  b_maxDrift: { value: +maxDrift.toFixed(3), threshold: T_MAX_DRIFT, pass: maxDrift <= T_MAX_DRIFT },
};
const PASS = Object.values(checks).every((c) => c.pass) && ok.length === perCurr.length;

// ── 리포트 ──────────────────────────────────────────────────
console.log('\nKE-T2 — 커리큘럼 진행률 → 그래프 좌표 흡수\n');
console.log(`구 좌표: ${CURRICULUM_SRC}`);
console.log(`  step() 호출 ${oldSteps.length}건 (문서의 109는 function step( 정의가 섞인 off-by-one)\n`);
const pad = (s, n) => String(s).padEnd(n); const padS = (s, n) => String(s).padStart(n);
console.log(`${pad('커리큘럼', 24)}${padS('구', 4)}${padS('신', 5)}${padS('실패', 6)}${padS('최저유사', 9)}${padS('최대편차', 9)}  goal`);
console.log('─'.repeat(104));
for (const c of perCurr) {
  if (c.error) { console.log(`${pad(c.curriculum, 24)}  ⚠ ${c.error}`); continue; }
  const flag = c.fails > 0 || c.worstDrift > T_MAX_DRIFT ? ' ✗' : '';
  console.log(`${pad(c.curriculum, 24)}${padS(c.oldSteps, 4)}${padS(c.newSteps, 5)}${padS(c.fails, 6)}${padS(c.minSim, 9)}${padS(c.worstDrift, 9)}${flag}  ${c.goal}`);
}
console.log('\n판정 (임계는 실행 전 봉인 — GOAL §1)\n');
console.log(`  (a) 매핑 실패        ${totalFails}  = 0 ?      ${checks.a_mappingFailures.pass ? 'PASS' : 'FAIL'}   [최저 유사도 ${globalMinSim}]`);
console.log(`  (b) 진행률 최대편차  ${(maxDrift * 100).toFixed(1)}%p  ≤ ${T_MAX_DRIFT * 100}%p ?  ${checks.b_maxDrift.pass ? 'PASS' : 'FAIL'}`);
console.log(`\n  ⇒ ${PASS ? 'PASS — 축 통일(흡수) 착수 가능' : 'FAIL — 흡수안 철회, 두 축 공존안으로 되돌아간다'}\n`);

const out = join(process.cwd(), 'docs/ref/rnd/KE-T2-RESULT.json');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify({ thresholds: { T_MIN_SIM, T_MAX_DRIFT }, checks, pass: PASS, perCurriculum: perCurr, mappings: rows }, null, 2));
console.log(`아티팩트: ${out}\n`);

if (GATE && !PASS) process.exit(2);
