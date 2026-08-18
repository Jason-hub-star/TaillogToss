/**
 * 반려견 API — CRUD + 환경 데이터
 * Parity: APP-001
 */
import { requestBackend } from './backend';
import { uploadImageToPublicStorage } from './storageImage';
import { measureStartupAsync } from 'lib/performance/startupPerformance';
import type {
  Dog, DogEnv, SurveyData,
  SurveyStage1Request, SurveyStage2Request, SurveyStage3Request,
  SurveyStatus, DogCreateResponse,
} from 'types/dog';
import { mapSurveyToDogEnv } from 'components/features/survey/survey-mapper';

interface BackendDogProfileFull {
  basic: {
    id: string;
    user_id: string;
    name: string;
    breed?: string | null;
    birth_date?: string | null;
    sex?: Dog['sex'] | null;
    weight_kg?: number | null;
    profile_image_url?: string | null;
    created_at: string;
    updated_at: string;
  };
  household_info?: DogEnv['household_info'];
  health_meta?: DogEnv['health_meta'];
  activity_meta?: DogEnv['activity_meta'];
  triggers?: string[];
  past_attempts?: string[];
  temperament?: DogEnv['temperament'];
  rewards_meta?: DogEnv['rewards_meta'];
  chronic_issues?: DogEnv['chronic_issues'];
  profile_meta?: Record<string, unknown>;
}

function mapBackendDogProfile(profile: BackendDogProfileFull): Dog {
  return {
    id: profile.basic.id,
    user_id: profile.basic.user_id,
    name: profile.basic.name,
    breed: profile.basic.breed ?? '',
    birth_date: profile.basic.birth_date ?? null,
    sex: profile.basic.sex ?? 'MALE',
    weight_kg: profile.basic.weight_kg ?? undefined,
    profile_image_url: profile.basic.profile_image_url ?? null,
    created_at: profile.basic.created_at,
    updated_at: profile.basic.updated_at,
  };
}

function mapBackendDogEnv(dogId: string, profile: BackendDogProfileFull): DogEnv {
  return {
    id: '',
    dog_id: dogId,
    household_info: profile.household_info ?? {} as DogEnv['household_info'],
    health_meta: profile.health_meta ?? {} as DogEnv['health_meta'],
    triggers: profile.triggers ?? [],
    past_attempts: profile.past_attempts ?? [],
    temperament: profile.temperament ?? null,
    activity_meta: profile.activity_meta ?? {} as DogEnv['activity_meta'],
    chronic_issues: profile.chronic_issues ?? null,
    rewards_meta: profile.rewards_meta ?? null,
    created_at: '',
    updated_at: '',
  };
}

/** 반려견 목록 조회 */
export async function getDogs(userId: string): Promise<Dog[]> {
  void userId;
  return requestBackend<Dog[]>('/api/v1/dogs/');
}

/** 반려견 상세 조회 */
export async function getDog(dogId: string): Promise<Dog> {
  const profile = await requestBackend<BackendDogProfileFull>(`/api/v1/dogs/${dogId}`);
  return mapBackendDogProfile(profile);
}

/** 반려견 환경 조회 */
export async function getDogEnv(dogId: string): Promise<DogEnv | null> {
  return measureStartupAsync(
    'api_dog_env_backend',
    { dogId },
    async () => {
      const profile = await requestBackend<BackendDogProfileFull>(`/api/v1/dogs/${dogId}`);
      return mapBackendDogEnv(dogId, profile);
    },
  );
}

type DogEnvUpdate = Partial<
  Pick<DogEnv, 'household_info' | 'health_meta' | 'triggers' | 'past_attempts' | 'temperament' | 'activity_meta' | 'rewards_meta'>
>;

/** 반려견 환경/맥락 수정 */
export async function updateDogEnv(dogId: string, updates: DogEnvUpdate): Promise<DogEnv> {
  const profile = await requestBackend<BackendDogProfileFull, DogEnvUpdate>(`/api/v1/dogs/${dogId}`, {
    method: 'PUT',
    body: updates,
  });
  return mapBackendDogEnv(dogId, profile);
}

/** 반려견 프로필 사진 업로드 */
export async function uploadDogProfileImage(userId: string, dogId: string, fileUri: string): Promise<string> {
  return uploadImageToPublicStorage('dog-profiles', `${userId}/${dogId}-${Date.now()}`, fileUri);
}

/** 설문 기반 반려견 등록 */
export async function createDogFromSurvey(userId: string, survey: SurveyData): Promise<Dog> {
  void userId;
  let dog = await requestBackend<Dog, {
    name: string;
    breed?: string;
    sex: Dog['sex'];
  }>('/api/v1/dogs/', {
    method: 'POST',
    body: {
      name: survey.step1_basic.name,
      breed: survey.step1_basic.breed,
      sex: survey.step1_basic.sex,
    },
  });

  // 사진이 있는 경우 업로드 및 업데이트
  if (survey.step1_basic.profile_image_url) {
    try {
      const publicUrl = await uploadDogProfileImage(dog.user_id, dog.id, survey.step1_basic.profile_image_url);
      dog = await updateDog(dog.id, { profile_image_url: publicUrl });
      dog.profile_image_url = publicUrl;
    } catch (e) {
      if (__DEV__) console.error('[API-001] Profile image upload failed:', e);
    }
  }

  const envData = mapSurveyToDogEnv(survey, dog.id);
  try {
    await updateDogEnv(dog.id, envData);
  } catch (e) {
    if (__DEV__) console.error('[API-001] Failed to create dog_env:', e);
    // 선택적: 생성된 dog 롤백 로직을 추가하거나 throw 할 수 있으나 일단 진행 허용
  }

  return dog as Dog;
}

/** 반려견 수정 */
export async function updateDog(dogId: string, updates: Partial<Dog>): Promise<Dog> {
  const profile = await requestBackend<BackendDogProfileFull, Partial<Dog>>(`/api/v1/dogs/${dogId}`, {
    method: 'PUT',
    body: updates,
  });
  return mapBackendDogProfile(profile);
}

/** 반려견 삭제 */
export async function deleteDog(dogId: string): Promise<void> {
  await requestBackend<void>(`/api/v1/dogs/${dogId}`, { method: 'DELETE' });
}

// ── Progressive Profiling Stage API ────────────────────────────────────────

/** Stage 1 제출 — Dog 신규 생성 */
export async function submitSurveyStage1(data: SurveyStage1Request): Promise<DogCreateResponse> {
  return requestBackend<DogCreateResponse, SurveyStage1Request>(
    '/api/v1/onboarding/survey/stage1',
    { method: 'POST', body: data },
  );
}

/** Stage 2 제출 — 행동/환경 저장, AI 코칭 활성화 */
export async function submitSurveyStage2(dogId: string, data: SurveyStage2Request): Promise<SurveyStatus> {
  return requestBackend<SurveyStatus, SurveyStage2Request>(
    `/api/v1/onboarding/survey/stage2/${dogId}`,
    { method: 'POST', body: data },
  );
}

/** Stage 3 제출 — 기질/건강, Pro 풀 개인화 */
export async function submitSurveyStage3(dogId: string, data: SurveyStage3Request): Promise<SurveyStatus> {
  return requestBackend<SurveyStatus, SurveyStage3Request>(
    `/api/v1/onboarding/survey/stage3/${dogId}`,
    { method: 'POST', body: data },
  );
}

/** 설문 완성도 조회 */
export async function getSurveyStatus(dogId: string): Promise<SurveyStatus> {
  return requestBackend<SurveyStatus>(`/api/v1/onboarding/survey/status/${dogId}`);
}

/** 기존 Stage 응답 수정 */
export async function patchSurveyStage(
  dogId: string,
  stage: 1 | 2 | 3,
  data: Record<string, unknown>,
): Promise<SurveyStatus> {
  return requestBackend<SurveyStatus, Record<string, unknown>>(
    `/api/v1/onboarding/survey/${dogId}/${stage}`,
    { method: 'PATCH', body: data },
  );
}
