/**
 * 커리큘럼 쇼케이스 정적 메타데이터 — 아카데미 JourneyMap 카드 표시용
 * Parity: UI-001
 */
import type { CurriculumId, CurriculumShowcase } from 'types/training';

export const CURRICULUM_SHOWCASES: Record<CurriculumId, CurriculumShowcase> = {
  basic_obedience: {
    id: 'basic_obedience',
    tagline: 'AI가 분석한 배변 패턴에 맞춘 5일 맞춤 훈련',
    target_behaviors: ['배변 실수', '장소 혼동'],
    preview_steps: ['실수 장소를 생활 구역으로 전환', '골든타임 에스코트', '패드 인식 훈련'],
    image_url: null,
  },
  leash_manners: {
    id: 'leash_manners',
    tagline: '산책 스트레스를 줄이는 리드줄 매너 훈련',
    target_behaviors: ['리드줄 당김', '다른 강아지 반응'],
    preview_steps: ['느슨한 리드줄 인식하기', '방향 전환 연습', '자극 거리 조절'],
    image_url: null,
  },
  separation_anxiety: {
    id: 'separation_anxiety',
    tagline: '혼자 있는 시간을 편안하게 만드는 단계적 접근',
    target_behaviors: ['분리 불안', '짖음', '파괴 행동'],
    preview_steps: ['안전 공간 만들기', '점진적 분리 시간 늘리기', '독립심 게임'],
    image_url: null,
  },
  reactivity_management: {
    id: 'reactivity_management',
    tagline: '자극에 차분하게 반응하는 법을 배워요',
    target_behaviors: ['과잉 반응', '짖음', '돌진'],
    preview_steps: ['자극 인식 & 보상', '거리 조절 산책', '대체 행동 훈련'],
    image_url: null,
  },
  impulse_control: {
    id: 'impulse_control',
    tagline: '참을성을 키우는 충동 조절 훈련',
    target_behaviors: ['음식 훔치기', '점프', '흥분'],
    preview_steps: ['기다려 연습', '문앞 매너', '자극 앞 자제력 키우기'],
    image_url: null,
  },
  socialization: {
    id: 'socialization',
    tagline: '다른 강아지와 사람에게 익숙해지는 사회화 훈련',
    target_behaviors: ['사람 경계', '강아지 경계', '새 환경 두려움'],
    preview_steps: ['안전한 만남 연출', '거리에서 관찰하기', '긍정 연결 만들기'],
    image_url: null,
  },
  fear_desensitization: {
    id: 'fear_desensitization',
    tagline: '공포 반응을 부드럽게 줄여가는 둔감화 훈련',
    target_behaviors: ['소음 공포', '특정 물체 공포', '장소 회피'],
    preview_steps: ['미세 자극 노출', '이완 반응 연습', '자극 강도 점진 증가'],
    image_url: null,
  },
};
