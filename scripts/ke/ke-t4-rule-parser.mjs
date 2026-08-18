#!/usr/bin/env node
/**
 * KE-T4 — 규칙 기반 ABC 파서가 LLM 없이 어느 정도 맞추는가
 * 계약: docs/goals/GOAL-ke-t4-rule-abc-parser.md (임계·사전 모두 실행 전 봉인)
 *
 * 사전은 도메인 지식으로 작성했고 정답지를 보고 튜닝하지 않는다.
 *   node scripts/ke/ke-t4-rule-parser.mjs [--gate] [--tailtree <path>]
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';

const argv = process.argv.slice(2);
const GATE = argv.includes('--gate');
const TT = argv.indexOf('--tailtree') >= 0 ? argv[argv.indexOf('--tailtree') + 1] : '/Users/family/jason/tailtree';

// ── 봉인 임계 (GOAL §2) ─────────────────────────────────────
const T_VET_RECALL = 1.0;      // 의학 신호는 하나도 놓치면 안 된다
const T_REFERRAL_RECALL = 0.70;
const T_TOPIC_ACC = 0.50;      // 실측 최빈 기준선 12.5% 의 4배

// ── 사전 (도메인 지식 · 정답 미참조) ────────────────────────
const VET = ['피가', '출혈', '혈변', '절뚝', '다리를 절', '구토', '토했', '토해', '설사',
  '발작', '경련', '식욕이 없', '안 먹', '못 먹', '살이 빠', '체중이', '실신', '쓰러',
  '통증', '아파하', '아픈', '다쳤', '상처', '종양', '혹이', '실금', '소변을 자주',
  '오줌을 자주', '피부', '탈모', '긁어', '귀를 털', '헐떡', '기침', '숨을 못', '수의사', '병원에 가'];

const TRAINER = ['물었', '물어서', '물린', '물어버', '입질', '으르렁', '이빨을 드러',
  '공격', '달려들어', '사람을 물', '아이를 물', '통제가 안', '감당이 안', '훈련사'];

const TOPIC = {
  reactivity: ['짖', '반응', '지나가는', '다른 개만 보면', '예민하게', '흥분해서 짖', '경계'],
  separation_anxiety: ['분리불안', '혼자 두', '혼자 있', '외출', '나가면', '집에 없', '낑낑', '우네', '울어', '문 앞'],
  hyperactivity: ['산만', '에너지', '가만히 못', '뛰어다', '과잉', '흥분을 못', '진정이 안'],
  socialization: ['사회화', '다른 개와', '낯선 사람', '만나면', '인사', '무서워하', '겁이 많'],
  puppy: ['퍼피', '개월', '아기 강아지', '새끼', '쌔끼', '어린 강아지', '유치원'],
  marking: ['마킹', '영역표시', '여기저기 소변', '다리를 들', '벽에 오줌'],
  leash: ['목줄', '리드줄', '산책', '줄을 당기', '끌고', '앞서 걸'],
  impulse: ['참지 못', '충동', '기다리지 못', '뺏', '지키려', '밥그릇', '자제'],
  basic: ['앉아', '기다려', '이리와', '기본 훈련', '말을 안 들', '배변', '화장실', '패드'],
  manners: ['매너', '식탁', '소파', '올라가', '뛰어올', '달려들', '초인종', '현관'],
  travel: ['차에', '차를', '이동장', '켄넬', '멀미', '차량', '이동할 때'],
  husbandry: ['발톱', '목욕', '빗질', '양치', '만지', '귀 청소', '미용', '드라이'],
  nosework: ['노즈워크', '냄새 맡기', '후각', '숨긴'],
  trick: ['재주', '트릭', '개인기', '손 주', '돌기'],
  rally_agility: ['어질리티', '랠리', '장애물', '스포츠', '허들'],
};

const hits = (text, list) => list.filter((k) => text.includes(k));

function parse(input) {
  const t = String(input || '');
  const vetHits = hits(t, VET);
  const trainerHits = hits(t, TRAINER);
  const scores = Object.entries(TOPIC)
    .map(([k, kws]) => ({ topic: k, n: hits(t, kws).length }))
    .sort((a, b) => b.n - a.n);
  const best = scores[0];
  const runnerUp = scores[1];
  return {
    referral: vetHits.length ? 'vet' : trainerHits.length ? 'trainer' : 'none',
    vetHits, trainerHits,
    topic: best.n > 0 ? best.topic : null,
    topicScore: best.n,
    // 폴백 조건: 주제를 못 고르거나(0), 1·2위가 동점이라 못 가른다
    needsLLM: best.n === 0 || (runnerUp && best.n === runnerUp.n),
  };
}

// ── 채점 ────────────────────────────────────────────────────
const items = JSON.parse(readFileSync(join(TT, 'data/ke1-v2-run.v0.json'), 'utf-8')).items;
const si = JSON.parse(readFileSync(join(TT, 'data/taxonomy/symptom-index.json'), 'utf-8')).index;
const fold = (i) => (typeof i === 'string' ? i.replace(/\.s\d+$/, '') : null);

const rows = items.map((x) => {
  const p = parse(x.input);
  const truthRef = x.referral || 'none';
  const truthTopic = x.curriculum || null;
  const node = x.entry_node;
  const truthSyms = node ? si[node] || si[fold(node)] || null : null;
  return {
    idx: x.idx, input: String(x.input).slice(0, 70),
    truthReferral: truthRef, predReferral: p.referral,
    truthTopic, predTopic: p.topic, topicScore: p.topicScore,
    needsLLM: p.needsLLM,
    truthSymptoms: truthSyms,
    vetHits: p.vetHits.slice(0, 3), trainerHits: p.trainerHits.slice(0, 3),
  };
});

const vetTruth = rows.filter((r) => r.truthReferral === 'vet');
const vetCaught = vetTruth.filter((r) => r.predReferral === 'vet');
const refTruth = rows.filter((r) => r.truthReferral !== 'none');
const refCaught = refTruth.filter((r) => r.predReferral !== 'none');
const refPred = rows.filter((r) => r.predReferral !== 'none');
const topicOk = rows.filter((r) => r.truthTopic && r.predTopic === r.truthTopic);
const fallback = rows.filter((r) => r.needsLLM);

const vetRecall = vetTruth.length ? vetCaught.length / vetTruth.length : 1;
const refRecall = refTruth.length ? refCaught.length / refTruth.length : 1;
const refPrecision = refPred.length ? refCaught.length / refPred.length : 1;
const topicAcc = topicOk.length / rows.length;
const fallbackRate = fallback.length / rows.length;

const checks = {
  a_vetRecall: { value: +vetRecall.toFixed(3), threshold: T_VET_RECALL, pass: vetRecall >= T_VET_RECALL },
  b_referralRecall: { value: +refRecall.toFixed(3), threshold: T_REFERRAL_RECALL, pass: refRecall >= T_REFERRAL_RECALL },
  c_topicAccuracy: { value: +topicAcc.toFixed(3), threshold: T_TOPIC_ACC, pass: topicAcc >= T_TOPIC_ACC },
};
const PASS = Object.values(checks).every((c) => c.pass);

console.log('\nKE-T4 — 규칙 기반 ABC 파서 (LLM 0회)\n');
console.log(`코퍼스: ${items.length}건 (tailtree ke1-v2-run.v0.json, 지식iN·카페 실입력)\n`);
console.log('판정 (임계·사전 모두 실행 전 봉인 — GOAL §2)\n');
const line = (n, v, t, p, extra = '') =>
  console.log(`  ${n}  ${String(v).padStart(6)}  ≥ ${t} ?  ${p ? 'PASS' : 'FAIL'}${extra}`);
line('(a) vet 재현율      ', checks.a_vetRecall.value, T_VET_RECALL, checks.a_vetRecall.pass, `   [${vetCaught.length}/${vetTruth.length}]`);
line('(b) 전체 의뢰 재현율', checks.b_referralRecall.value, T_REFERRAL_RECALL, checks.b_referralRecall.pass, `   [${refCaught.length}/${refTruth.length}]`);
line('(c) 주제 라우팅     ', checks.c_topicAccuracy.value, T_TOPIC_ACC, checks.c_topicAccuracy.pass, `   [${topicOk.length}/${rows.length}, 최빈 기준선 0.125]`);
console.log(`\n  ⇒ ${PASS ? 'PASS — 무료 등급 LLM 예산 0 설계 성립' : 'FAIL — 무료 단가 재계산 필요'}\n`);
console.log('보고만 (임계 없음)');
console.log(`  LLM 폴백률       ${fallbackRate.toFixed(3)}  [${fallback.length}/${rows.length}]  ← 무료 등급 단가의 입력값`);
console.log(`  의뢰 정밀도      ${refPrecision.toFixed(3)}  [${refCaught.length}/${refPred.length}]  ← 낮으면 과잉 의뢰`);
const withSym = rows.filter((r) => r.truthSymptoms);
console.log(`  entry_node 보유  ${withSym.length}/${rows.length} (나머지는 정답 null — 채점 제외)\n`);

const out = join(process.cwd(), 'docs/ref/rnd/KE-T4-RESULT.json');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify({
  thresholds: { T_VET_RECALL, T_REFERRAL_RECALL, T_TOPIC_ACC },
  baselines: { topicMajority: 0.125, topicRandom: 1 / 15, referralMajorityNone: 101 / 128 },
  checks, pass: PASS,
  reported: { fallbackRate: +fallbackRate.toFixed(3), referralPrecision: +refPrecision.toFixed(3) },
  rows,
}, null, 2));
console.log(`아티팩트: ${out}\n`);

if (GATE && !PASS) process.exit(2);
