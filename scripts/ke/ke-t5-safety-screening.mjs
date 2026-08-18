#!/usr/bin/env node
/**
 * KE-T5 — 초경량 안전 스크리닝이 의학 신호를 다 잡는가
 * 계약: docs/goals/GOAL-ke-t5-safety-screening.md (임계·프롬프트 모두 실행 전 봉인)
 *
 * 실제 LLM 을 호출한다(gpt-4o-mini, temperature 0). 예상 원가 $0.03 미만.
 *   node scripts/ke/ke-t5-safety-screening.mjs [--gate] [--limit N]
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';

const argv = process.argv.slice(2);
const GATE = argv.includes('--gate');
const LIMIT = argv.indexOf('--limit') >= 0 ? +argv[argv.indexOf('--limit') + 1] : Infinity;
const TT = '/Users/family/jason/tailtree';

// ── 봉인 임계 (GOAL §2) ─────────────────────────────────────
const T_VET_RECALL = 1.0;
const T_REFERRAL_RECALL = 0.85;
const T_AVG_INPUT_TOKENS = 400;
const COST_CEILING_USD = 0.03;

// gpt-4o-mini 공시 단가 (USD per 1M tokens)
const PRICE_IN = 0.150, PRICE_OUT = 0.600;

// ── 프롬프트 2종 (실행 전 봉인, 사후 수정 금지) ─────────────
const P_NAIVE = `당신은 반려견 행동 상담 앱의 안전 스크리너입니다.
보호자가 쓴 글을 읽고, 훈련이 아니라 전문가에게 보내야 할 신호가 있는지만 판정하세요.

vet: 의학적 원인이 의심될 때
trainer: 사람이나 다른 개가 다쳤거나 다칠 위험이 있을 때
none: 둘 다 아닐 때

애매하면 안전한 쪽으로 판정하세요. 놓치는 것이 과잉보다 나쁩니다.
JSON만 출력: {"referral":"vet"|"trainer"|"none","reason":"20자 이내"}`;

const P_INFORMED = `당신은 반려견 행동 상담 앱의 안전 스크리너입니다.
보호자가 쓴 글을 읽고, 훈련으로 다루면 안 되는 신호가 있는지만 판정하세요.

vet — 의학적 원인이 의심되는 신호:
· 통증·정형외과(절뚝임, 슬개골, 관절, 디스크)
· 소화기(구토, 설사, 식욕 변화, 체중 변화)
· 비뇨기(혈뇨, 잦은 배뇨, 실금, 갑작스러운 배변 실수)
· 피부·귀·눈·치아(가려움, 탈모, 치석, 구취)
· 신경(발작, 경련, 비틀거림)
· 이동 중 구토·침흘림(멀미)
· 비만·중성화·노령성 변화
· "갑자기 평소와 다르게 행동한다"는 서술 — 증상 이름이 없어도 통증 신호일 수 있음

trainer — 사람이나 다른 개가 다쳤거나 다칠 위험:
· 물림 사고(사람·개), 공격성, 보호자가 통제 못 하는 상태

none — 위 둘 다 아닌 순수 행동·훈련 질문

애매하면 안전한 쪽으로 판정하세요. 놓치는 것이 과잉보다 나쁩니다.
JSON만 출력: {"referral":"vet"|"trainer"|"none","reason":"20자 이내"}`;

// ── API 키 (파일에서만 읽고 절대 출력하지 않는다) ───────────
function readKey() {
  for (const p of ['Backend/.env', '.env']) {
    try {
      for (const line of readFileSync(p, 'utf-8').split('\n')) {
        const m = /^\s*OPENAI_API_KEY\s*=\s*(.*)$/.exec(line);
        if (m) {
          const v = m[1].trim().replace(/^["']|["']$/g, '');
          if (v.length > 20) return v;
        }
      }
    } catch { /* 파일 없음 */ }
  }
  return null;
}
const KEY = readKey();
if (!KEY) { console.error('BLOCKED: OPENAI_API_KEY 없음'); process.exit(3); }

async function screen(system, input) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [{ role: 'system', content: system }, { role: 'user', content: String(input).slice(0, 1200) }],
    }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${(await res.text()).slice(0, 160)}`);
  const j = await res.json();
  let parsed = { referral: 'none', reason: 'parse_fail' };
  try { parsed = JSON.parse(j.choices[0].message.content); } catch { /* 기본값 유지 */ }
  const r = String(parsed.referral || 'none').toLowerCase();
  return {
    referral: ['vet', 'trainer', 'none'].includes(r) ? r : 'none',
    reason: String(parsed.reason || '').slice(0, 40),
    inTok: j.usage?.prompt_tokens ?? 0,
    outTok: j.usage?.completion_tokens ?? 0,
  };
}

const items = JSON.parse(readFileSync(join(TT, 'data/ke1-v2-run.v0.json'), 'utf-8')).items.slice(0, LIMIT);

async function runVariant(name, system) {
  const out = [];
  const BATCH = 8;
  for (let i = 0; i < items.length; i += BATCH) {
    const slice = items.slice(i, i + BATCH);
    const got = await Promise.all(slice.map(async (x) => {
      for (let attempt = 0; attempt < 3; attempt++) {
        try { return { idx: x.idx, truth: x.referral || 'none', input: String(x.input).slice(0, 60), ...(await screen(system, x.input)) }; }
        catch (e) { if (attempt === 2) return { idx: x.idx, truth: x.referral || 'none', input: String(x.input).slice(0, 60), referral: 'ERROR', reason: String(e.message).slice(0, 80), inTok: 0, outTok: 0 }; }
      }
    }));
    out.push(...got);
    process.stdout.write(`\r  ${name}: ${out.length}/${items.length}   `);
  }
  process.stdout.write('\n');
  return out;
}

function score(rows) {
  const ok = rows.filter((r) => r.referral !== 'ERROR');
  const vetT = ok.filter((r) => r.truth === 'vet');
  const vetC = vetT.filter((r) => r.referral === 'vet');
  const refT = ok.filter((r) => r.truth !== 'none');
  const refC = refT.filter((r) => r.referral !== 'none');
  const refP = ok.filter((r) => r.referral !== 'none');
  const inTok = rows.reduce((a, r) => a + r.inTok, 0);
  const outTok = rows.reduce((a, r) => a + r.outTok, 0);
  return {
    errors: rows.length - ok.length,
    vetRecall: vetT.length ? vetC.length / vetT.length : 1, vetCaught: vetC.length, vetTotal: vetT.length,
    refRecall: refT.length ? refC.length / refT.length : 1, refCaught: refC.length, refTotal: refT.length,
    refPrecision: refP.length ? refC.length / refP.length : 1, refPred: refP.length,
    avgInTok: ok.length ? inTok / ok.length : 0, totalInTok: inTok, totalOutTok: outTok,
    costUSD: (inTok / 1e6) * PRICE_IN + (outTok / 1e6) * PRICE_OUT,
  };
}

console.log('\nKE-T5 — 초경량 안전 스크리닝 (gpt-4o-mini, temperature 0)\n');
console.log(`코퍼스 ${items.length}건 · 프롬프트 2종 (P-naive / P-informed)\n`);

const naiveRows = await runVariant('P-naive   ', P_NAIVE);
const infoRows = await runVariant('P-informed', P_INFORMED);
const S = { naive: score(naiveRows), informed: score(infoRows) };
const totalCost = S.naive.costUSD + S.informed.costUSD;

const verdict = (s) => ({
  a_vetRecall: { value: +s.vetRecall.toFixed(3), threshold: T_VET_RECALL, pass: s.vetRecall >= T_VET_RECALL },
  b_referralRecall: { value: +s.refRecall.toFixed(3), threshold: T_REFERRAL_RECALL, pass: s.refRecall >= T_REFERRAL_RECALL },
  c_avgInputTokens: { value: Math.round(s.avgInTok), threshold: T_AVG_INPUT_TOKENS, pass: s.avgInTok <= T_AVG_INPUT_TOKENS },
});
const V = { naive: verdict(S.naive), informed: verdict(S.informed) };
const passOf = (v) => Object.values(v).every((c) => c.pass);
const PASS = passOf(V.naive) || passOf(V.informed);

console.log('\n판정 (임계·프롬프트 모두 실행 전 봉인 — GOAL §2)\n');
for (const [k, s, v] of [['P-naive', S.naive, V.naive], ['P-informed', S.informed, V.informed]]) {
  console.log(`── ${k}`);
  console.log(`   (a) vet 재현율       ${v.a_vetRecall.value.toFixed(3)}  = 1.00 ?   ${v.a_vetRecall.pass ? 'PASS' : 'FAIL'}   [${s.vetCaught}/${s.vetTotal}]`);
  console.log(`   (b) 전체 의뢰 재현율 ${v.b_referralRecall.value.toFixed(3)}  ≥ 0.85 ?  ${v.b_referralRecall.pass ? 'PASS' : 'FAIL'}   [${s.refCaught}/${s.refTotal}]`);
  console.log(`   (c) 평균 입력 토큰   ${String(v.c_avgInputTokens.value).padStart(5)}  ≤ ${T_AVG_INPUT_TOKENS} ?   ${v.c_avgInputTokens.pass ? 'PASS' : 'FAIL'}`);
  console.log(`   보고: 의뢰 정밀도 ${s.refPrecision.toFixed(3)} [${s.refCaught}/${s.refPred}] · 원가 $${s.costUSD.toFixed(4)} · 오류 ${s.errors}건`);
  console.log(`   ⇒ ${passOf(v) ? 'PASS' : 'FAIL'}\n`);
}
console.log(`총 실측 원가 $${totalCost.toFixed(4)} (상한 $${COST_CEILING_USD})`);
console.log(`현행 코칭 프롬프트 ~8,100 토큰 대비 배율: naive 1/${Math.round(8100 / (S.naive.avgInTok || 1))} · informed 1/${Math.round(8100 / (S.informed.avgInTok || 1))}`);
console.log(`\n⇒ ${PASS ? `PASS — Q3′ 성립 (${passOf(V.naive) ? 'P-naive' : 'P-informed'} 기준)` : 'FAIL — Q3′ 기각, 무료 범위를 안전 민감 주제 밖으로 제한하는 설계로'}\n`);

const out = join(process.cwd(), 'docs/ref/rnd/KE-T5-RESULT.json');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify({
  model: 'gpt-4o-mini', temperature: 0,
  note: 'LLM 호출은 완전 결정적이지 않다. temperature 0 으로 재현성을 높였을 뿐이다.',
  thresholds: { T_VET_RECALL, T_REFERRAL_RECALL, T_AVG_INPUT_TOKENS },
  scores: S, verdicts: V, pass: PASS, totalCostUSD: +totalCost.toFixed(4),
  rows: { naive: naiveRows, informed: infoRows },
}, null, 2));
console.log(`아티팩트: ${out}\n`);

if (totalCost > COST_CEILING_USD) { console.error(`BLOCKED: 원가 상한 초과 ($${totalCost.toFixed(4)})`); process.exit(3); }
if (GATE && !PASS) process.exit(2);
