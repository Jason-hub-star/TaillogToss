/**
 * 행동 기록(ABC 로그) 도메인 타입 — DogCoach log.py 마이그레이션 + 빠른기록
 * Parity: LOG-001
 */

/** 빠른 기록 카테고리 (8종 — 행동) */
export type QuickLogCategory =
  | 'barking'
  | 'biting'
  | 'jumping'
  | 'pulling'
  | 'destructive'
  | 'anxiety'
  | 'aggression'
  | 'other_behavior';

/** 일상 활동 카테고리 (6종) */
export type DailyActivityCategory =
  | 'walk'
  | 'meal'
  | 'training'
  | 'play'
  | 'rest'
  | 'grooming';

/** 강도 수준 (1-10) */
export type IntensityLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

/** 미디어 에셋 유형 */
export type AssetType = 'PHOTO' | 'VIDEO';

/** ABC 행동 기록 (상세 기록) */
export interface BehaviorLog {
  id: string; // UUID
  dog_id: string; // FK → dogs.id
  is_quick_log: boolean;

  // 빠른 기록 필드
  quick_category: QuickLogCategory | null;
  daily_activity: DailyActivityCategory | null;

  // ABC 상세 기록 필드
  type_id: string | null; // 행동 유형 분류 ID
  antecedent: string | null; // A: 선행자극
  behavior: string | null; // B: 행동
  consequence: string | null; // C: 결과

  // 공통 필드
  intensity: IntensityLevel;
  duration_minutes: number | null;
  location: string | null;
  memo: string | null;
  occurred_at: string; // ISO 8601
  created_at: string;
  updated_at: string;

  // B2B 확장 (optional — B2C에서는 항상 undefined)
  org_id?: string; // FK → organizations.id
  recorded_by?: string; // FK → users.id (기록 작성자)
}

/** 미디어 에셋 */
export interface MediaAsset {
  id: string;
  log_id: string | null; // FK → behavior_logs.id (SET NULL on delete)
  storage_url: string;
  asset_type: AssetType;
  created_at: string;
}

/** 빠른 기록 입력 DTO */
export interface QuickLogInput {
  dog_id: string;
  category: QuickLogCategory | DailyActivityCategory;
  intensity: IntensityLevel;
  occurred_at: string;
  memo?: string;
  location?: string;
  duration_minutes?: number;
}

/** ABC 상세 기록 입력 DTO */
export interface DetailedLogInput {
  dog_id: string;
  type_id: string;
  antecedent: string;
  behavior: string;
  consequence: string;
  intensity: IntensityLevel;
  duration_minutes?: number;
  location?: string;
  memo?: string;
  occurred_at: string;
}
