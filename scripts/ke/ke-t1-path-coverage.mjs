#!/usr/bin/env node
/**
 * KE-T1 — how 카드가 증상→목표 경로를 연속으로 채우는가
 * 계약: docs/goals/GOAL-ke-t1-path-coverage.md (임계는 실행 전 봉인)
 *
 * 읽기 전용. tailtree taxonomy + TaillogToss 기준선을 대조해 PASS/FAIL 판정.
 *   node scripts/ke/ke-t1-path-coverage.mjs [--gate] [--tailtree <path>]
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';

const argv = process.argv.slice(2);
const GATE = argv.includes('--gate');
const TT = (() => {
  const i = argv.indexOf('--tailtree');
  return i >= 0 ? argv[i + 1] : '/Users/family/jason/tailtree';
})();
const TAX = join(TT, 'data/taxonomy');
const read = (f) => JSON.parse(readFileSync(join(TAX, f), 'utf-8'));

// ── 봉인 임계 (GOAL §1) ─────────────────────────────────────
const T_UNIQUENESS = 0.85; // 현행 실측 0.70 대비 개선
const T_MAX_GAP = 1;       // 연속 빈칸 2개면 유저가 막힌다
const T_MIN_HOW = 5;       // 현행 평균 15.6스텝의 1/3

// ── 기준선 (현행 TaillogToss, 실측 고정) ────────────────────
const BASELINE = {
  source: 'src/lib/data/mappings/behaviorToCurriculum.ts + catalog.json',
  entries: 10, uniquePaths: 7, uniqueness: 7 / 10,
  fillRate: 1.0, avgSteps: 109 / 7,
};

// ── BehaviorType 10 → tailtree 증상 (사과 대 사과 비교용) ───
const BEHAVIOR_TO_SYMPTOM = {
  separation: 'alone',
  anxiety: 'fearful',
  barking: 'barking',
  destructive: 'destructive',
  reactivity: 'dog_greeting',
  aggression: 'biting',
  resource_guarding: 'resource_guarding',
  leash_pulling: 'leash_pulling',
  jumping: 'jumping',
  other: 'cues',
};

const nodes = read('nodes.json').nodes;
const edges = read('edges.json').edges;
const how = read('how.json').entries;
const symIndex = read('symptom-index.json').index;

const byId = new Map(nodes.map((n) => [n.id, n]));
const hasHow = (id) => Object.prototype.hasOwnProperty.call(how, id);

// 원자만 경로에 쓴다 — how 카드는 원자 단위로 붙고, `.sN` 스텝은 그 카드 '안'에 들어 있다.
// 스텝을 경로 노드로 세면 정의상 전부 빈칸이 되어 지표가 무의미해진다(2026-08-18 KE-T1 패스1 오류).
const isStep = (id) => /\.s\d+$/.test(id);

// 선행 인접: to ← from (from 이 선행조건)
// hard = 원자 '내부' 스텝 사다리, soft = 원자 '간' 선행 — 커리큘럼 순서는 soft 쪽이다.
// 따라서 둘 다 쓰되, 스텝 노드는 원자로 접어서(fold) 잇는다.
const fold = (id) => (isStep(id) ? id.replace(/\.s\d+$/, '') : id);
const prereqs = new Map();
for (const e of edges) {
  const to = fold(e.to), from = fold(e.from);
  if (to === from) continue; // 같은 원자 내부 스텝 순서는 경로가 아니다
  if (!prereqs.has(to)) prereqs.set(to, []);
  if (!prereqs.get(to).includes(from)) prereqs.get(to).push(from);
}

// 증상 → 그 증상으로 인덱싱된 노드들
const symptomNodes = new Map();
for (const [nodeId, syms] of Object.entries(symIndex)) {
  for (const s of syms) {
    if (!symptomNodes.has(s)) symptomNodes.set(s, []);
    symptomNodes.get(s).push(nodeId);
  }
}

/**
 * goal 의 선행 폐포(모든 선행조건) + goal 을 위상 정렬해 사다리로 만든다.
 * 최장경로 memo 방식은 조상 체인이 겹칠 때 같은 노드를 중복 삽입한다(패스 2 실측:
 * skill.mechanics.reward 가 한 경로에 2회) — 폐포+위상정렬은 중복이 원천 불가능하다.
 */
function ladder(goal) {
  // 1) 선행 폐포
  const set = new Set([goal]);
  const stack = [goal];
  while (stack.length) {
    const cur = stack.pop();
    for (const p of prereqs.get(cur) || []) {
      if (!set.has(p)) { set.add(p); stack.push(p); }
    }
  }
  // 2) 깊이 = 폐포 안에서 루트로부터의 최장 거리 (순환 방어)
  const depth = new Map();
  const visiting = new Set();
  const d = (id) => {
    if (depth.has(id)) return depth.get(id);
    if (visiting.has(id)) return 0;
    visiting.add(id);
    let m = 0;
    for (const p of prereqs.get(id) || []) {
      if (set.has(p)) m = Math.max(m, d(p) + 1);
    }
    visiting.delete(id);
    depth.set(id, m);
    return m;
  };
  return [...set].sort((a, b) => d(a) - d(b) || a.localeCompare(b));
}

/** 정렬된 경로에서 how 없는 노드의 최대 연속 길이 */
function maxGap(path) {
  let cur = 0, max = 0;
  for (const id of path) {
    if (hasHow(id)) cur = 0;
    else { cur += 1; if (cur > max) max = cur; }
  }
  return max;
}

const rows = [];
for (const [behavior, symptom] of Object.entries(BEHAVIOR_TO_SYMPTOM)) {
  const cands = [...new Set((symptomNodes.get(symptom) || []).map(fold))];
  if (cands.length === 0) {
    rows.push({ behavior, symptom, goal: null, error: 'symptom-index 에 해당 증상 노드 없음' });
    continue;
  }
  // 목표 = how 보유 후보 중 가장 깊은 것(col 최대). 없으면 전체 중 가장 깊은 것
  const withHow = cands.filter(hasHow);
  const pool = withHow.length ? withHow : cands;
  const goal = pool.reduce((a, b) => ((byId.get(b)?.col ?? 0) > (byId.get(a)?.col ?? 0) ? b : a));
  const path = ladder(goal);
  const howCount = path.filter(hasHow).length;
  rows.push({
    behavior, symptom, goal,
    goalLabel: byId.get(goal)?.label ?? '?',
    pathLen: path.length,
    howCount,
    fillRate: +(howCount / path.length).toFixed(3),
    maxGap: maxGap(path),
    goalHasHow: hasHow(goal),
    path: path.map((id) => ({ id, how: hasHow(id) })),
  });
}

const ok = rows.filter((r) => !r.error);
const uniquePaths = new Set(ok.map((r) => r.path.map((p) => p.id).join('>'))).size;
const uniqueness = +(uniquePaths / rows.length).toFixed(3);
const worstGap = Math.max(...ok.map((r) => r.maxGap), 0);
const minHow = ok.length ? Math.min(...ok.map((r) => r.howCount)) : 0;

const checks = {
  a_uniqueness: { value: uniqueness, threshold: T_UNIQUENESS, baseline: BASELINE.uniqueness, pass: uniqueness >= T_UNIQUENESS },
  b_maxGap: { value: worstGap, threshold: T_MAX_GAP, pass: worstGap <= T_MAX_GAP },
  c_minHowPerPath: { value: minHow, threshold: T_MIN_HOW, pass: minHow >= T_MIN_HOW },
};
const PASS = Object.values(checks).every((c) => c.pass) && ok.length === rows.length;

// ── 리포트 ──────────────────────────────────────────────────
console.log('\nKE-T1 — 증상 경로 how 커버리지\n');
console.log(`taxonomy: ${TAX}`);
const atomIds = nodes.map((n) => n.id).filter((id) => !isStep(id));
const atomsWithHow = atomIds.filter(hasHow).length;
console.log(`노드 ${nodes.length} = 원자 ${atomIds.length} + 스텝 ${nodes.length - atomIds.length}`);
console.log(`how ${Object.keys(how).length} → 원자 커버리지 ${atomsWithHow}/${atomIds.length} = ${(atomsWithHow / atomIds.length * 100).toFixed(1)}%`);
console.log(`선행 엣지(원자 접기 후) ${[...prereqs.values()].flat().length}\n`);
const pad = (s, n) => String(s).padEnd(n);
const padS = (s, n) => String(s).padStart(n);
console.log(`${pad('behavior', 18)}${pad('증상', 18)}${padS('경로', 5)}${padS('how', 5)}${padS('충전율', 8)}${padS('최대빈칸', 9)}  목표 노드`);
console.log('─'.repeat(108));
for (const r of rows) {
  if (r.error) { console.log(`${pad(r.behavior, 18)}${pad(r.symptom, 18)}  ⚠ ${r.error}`); continue; }
  const flag = r.maxGap > T_MAX_GAP || r.howCount < T_MIN_HOW ? ' ✗' : '';
  console.log(`${pad(r.behavior, 18)}${pad(r.symptom, 18)}${padS(r.pathLen, 5)}${padS(r.howCount, 5)}${padS(r.fillRate, 8)}${padS(r.maxGap, 9)}${flag}  ${r.goal}`);
}
console.log('\n판정 (임계는 실행 전 봉인 — GOAL §1)\n');
console.log(`  (a) 경로 고유성      ${uniqueness}  ≥ ${T_UNIQUENESS} ?  ${checks.a_uniqueness.pass ? 'PASS' : 'FAIL'}   [현행 기준선 ${BASELINE.uniqueness}]`);
console.log(`  (b) 최대 연속 빈칸   ${worstGap}      ≤ ${T_MAX_GAP} ?     ${checks.b_maxGap.pass ? 'PASS' : 'FAIL'}`);
console.log(`  (c) 경로당 최소 how  ${minHow}      ≥ ${T_MIN_HOW} ?     ${checks.c_minHowPerPath.pass ? 'PASS' : 'FAIL'}`);
console.log(`\n  ⇒ ${PASS ? 'PASS — 이식 착수 가능' : 'FAIL — 이식 착수 금지. 다음 과제는 how 생산(/웨이브)'}\n`);

const out = join(process.cwd(), 'docs/ref/rnd/KE-T1-RESULT.json');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify({ baseline: BASELINE, thresholds: { T_UNIQUENESS, T_MAX_GAP, T_MIN_HOW }, checks, pass: PASS, rows }, null, 2));
console.log(`아티팩트: ${out}\n`);

if (GATE && !PASS) process.exit(2);
