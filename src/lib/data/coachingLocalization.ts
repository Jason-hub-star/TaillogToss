import type { CurriculumId } from 'types/training';

export const CURRICULUM_LABELS: Record<CurriculumId, string> = {
  separation_anxiety: '분리불안 완화 훈련',
  reactivity_management: '반응성 관리 훈련',
  fear_desensitization: '공포·소리·핸들링 둔감화',
  impulse_control: '충동 조절 훈련',
  leash_manners: '산책 매너 훈련',
  basic_obedience: '기본 예절 루틴',
  socialization: '사회화 적응 훈련',
};

const TOOL_LABELS: Record<string, string> = {
  'high-value treats': '좋아하는 간식',
  'treat pouch': '간식 파우치',
  'marker word': '표시어',
  clicker: '클리커',
  'marker word/clicker': '표시어/클리커',
  mat: '매트',
  'mat/bed': '매트/침대',
  toys: '장난감',
  'front-clip harness': '앞고리 하네스',
  'fixed leash': '고정 리드줄',
  'long line': '롱라인',
  'fixed leash/long line': '고정 리드줄/롱라인',
  'baby gate/pen': '안전문/펜스',
  'visual barrier': '시야 차단막',
  'white noise': '백색소음',
  'sound file': '소리 파일',
  'white noise/sound file': '백색소음/소리 파일',
  'lick mat/snuffle mat': '리킹매트/노즈워크 매트',
  'grooming dummy tools': '모형 미용 도구',
  'towel/non-slip mat': '수건/미끄럼 방지 매트',
  'video log': '영상 기록',
};

const ID_LABEL_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bowner_leaves\b/gi, '보호자 외출'],
  [/\bseparation\b/gi, '혼자 있는 상황'],
  [/\bseparation_anxiety\b/gi, '분리불안'],
  [/\bother_dogs?\b/gi, '다른 강아지'],
  [/\bstrangers?\b/gi, '낯선 사람'],
  [/\bvisitor\b/gi, '방문객'],
  [/\bdoorbell\b/gi, '초인종'],
  [/\bnoise\b/gi, '소리 자극'],
  [/\bleash_pulling\b/gi, '줄 당김'],
  [/\bresource_guarding\b/gi, '자원 지킴'],
  [/\bdestructive\b/gi, '물어뜯기'],
  [/\bbarking\b/gi, '짖음'],
  [/\breactivity\b/gi, '반응성'],
  [/\banxiety\b/gi, '불안'],
  [/\baggression\b/gi, '공격성'],
  [/\bjumping\b/gi, '뛰어오름'],
  [/\bother\b/gi, '기타 행동'],
];

const TEXT_REPLACEMENTS: Array<[RegExp, string]> = [
  [/counter[- ]?conditioning/gi, '좋은 경험으로 다시 연결하기'],
  [/desensitization/gi, '둔감화'],
  [/differential reinforcement|DRA|DRI|DRO/gi, '대체 행동 보상'],
  [/LAT|look-at-that/gi, '보고 보상하기'],
  [/BAT-style distance control/gi, '거리 조절 훈련'],
  [/mat\/place training|mat training|place training/gi, '매트 자리 훈련'],
  [/stationing/gi, '지정 자리 기다리기'],
  [/recall\/U-turn|U-turn/gi, '불러오기와 방향 바꾸기'],
  [/hand target/gi, '손 타깃'],
  [/pattern games/gi, '반복 패턴 놀이'],
  [/cooperative care|start-button behaviors/gi, '협조 케어'],
  [/muzzle conditioning/gi, '입마개 적응 훈련'],
  [/management before training/gi, '훈련 전 환경 관리'],
  [/positive reinforcement/gi, '긍정 강화'],
  [/threshold management/gi, '감당 가능한 선 지키기'],
  [/predictability/gi, '예측 가능성'],
  [/choice\/control|choice and control/gi, '선택권과 통제감'],
  [/safety signal/gi, '안전 신호'],
  [/arousal regulation/gi, '흥분 조절'],
  [/recovery latency/gi, '회복 시간'],
  [/frustration tolerance/gi, '기다림 적응'],
  [/attachment security/gi, '안정 애착'],
  [/stimulus control/gi, '신호 구분'],
  [/reinforcement history/gi, '보상 경험'],
  [/generalization/gi, '상황 일반화'],
  [/trigger stacking/gi, '자극 누적'],
  [/quiet room/gi, '조용한 방'],
  [/distance in meters/gi, '거리 조절'],
  [/door\/gate boundary/gi, '문/안전문 경계'],
  [/parallel walking path/gi, '평행 산책 동선'],
  [/visitor entry routine/gi, '방문객 입장 루틴'],
  [/separate feeding zones/gi, '분리 급식 공간'],
  [/grooming table\/floor choice/gi, '미용대 또는 바닥 선택'],
  [/sound volume steps/gi, '소리 볼륨 단계'],
  [/safe zone/gi, '안전 공간'],
  [/escape route prevention without force/gi, '강압 없는 안전 동선 관리'],
];

const ASCIIISH_PATTERN = /^[a-z0-9_\-/ ().,+]+$/i;

export function isKnownCurriculumId(value?: string | null): value is CurriculumId {
  return !!value && Object.prototype.hasOwnProperty.call(CURRICULUM_LABELS, value);
}

export function firstKnownCurriculumId(values: Array<string | undefined> | undefined): CurriculumId | null {
  if (!values?.length) return null;
  return values.find(isKnownCurriculumId) ?? null;
}

export function localizeTool(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return '준비물';
  return TOOL_LABELS[normalized] ?? localizeStructuredText(value, '맞춤 준비물');
}

export function localizeCurriculum(value: string): string {
  const normalized = value.trim();
  if (!normalized) return '맞춤 훈련';
  return isKnownCurriculumId(normalized) ? CURRICULUM_LABELS[normalized] : localizeStructuredText(value, '맞춤 훈련');
}

export function localizeStructuredText(value: string, fallback = '맞춤 안내'): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  const idLocalized = ID_LABEL_REPLACEMENTS.reduce(
    (text, [pattern, replacement]) => text.replace(pattern, replacement),
    trimmed,
  );
  const localized = TEXT_REPLACEMENTS.reduce(
    (text, [pattern, replacement]) => text.replace(pattern, replacement),
    idLocalized,
  );
  return ASCIIISH_PATTERN.test(localized) || /[A-Za-z]{3,}/.test(localized) ? fallback : localized;
}

export function formatLocalizedList(values: string[] | undefined, formatter: (value: string) => string): string {
  if (!values?.length) return '';
  return Array.from(new Set(values.map(formatter).filter(Boolean))).join(', ');
}
