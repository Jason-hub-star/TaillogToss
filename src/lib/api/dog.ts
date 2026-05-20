/**
 * 반려견 API — CRUD + 환경 데이터
 * Parity: APP-001
 */
import { supabase } from './supabase';
import { requestBackend } from './backend';
import { measureStartupAsync } from 'lib/performance/startupPerformance';
import type {
  Dog, DogEnv, SurveyData,
  SurveyStage1Request, SurveyStage2Request, SurveyStage3Request,
  SurveyStatus, DogCreateResponse,
} from 'types/dog';
import { mapSurveyToDogEnv } from 'components/features/survey/survey-mapper';

function getImageUploadMeta(fileUri: string): { extension: string; contentType: string } {
  const dataUriMatch = /^data:(image\/([a-zA-Z0-9.+-]+));base64,/.exec(fileUri);
  if (dataUriMatch) {
    const contentType = dataUriMatch[1] ?? 'image/png';
    const rawExtension = (dataUriMatch[2] ?? 'png').toLowerCase();
    const extension = rawExtension === 'jpeg' ? 'jpg' : rawExtension.replace('+xml', '');
    return { extension, contentType };
  }

  const uriWithoutQuery = fileUri.split('?')[0] ?? fileUri;
  const cleanUri = uriWithoutQuery.split('#')[0] ?? uriWithoutQuery;
  const lastSegment = cleanUri.split('/').pop() ?? '';
  const extension = lastSegment.includes('.') ? lastSegment.split('.').pop()?.toLowerCase() || 'jpg' : 'jpg';
  const normalizedExtension = extension === 'jpeg' ? 'jpg' : extension;
  const contentType = normalizedExtension === 'jpg' ? 'image/jpeg' : `image/${normalizedExtension}`;

  return { extension: normalizedExtension, contentType };
}

function dataUriToArrayBuffer(fileUri: string): ArrayBuffer {
  const base64 = fileUri.replace(/^data:[^;]+;base64,/, '');
  const binary = atob(base64);
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return buffer;
}

function requestUriAsBlob(fileUri: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(xhr.response as Blob);
      } else {
        reject(new Error(`Image request failed with status ${xhr.status}`));
      }
    };
    xhr.onerror = () => reject(new Error('Image request failed'));
    xhr.responseType = 'blob';
    xhr.open('GET', fileUri);
    xhr.send();
  });
}

async function readImageBody(fileUri: string): Promise<Blob | ArrayBuffer> {
  if (fileUri.startsWith('data:')) {
    return dataUriToArrayBuffer(fileUri);
  }

  try {
    const response = await fetch(fileUri);
    return await response.blob();
  } catch (fetchError) {
    if (/^(content|file):\/\//.test(fileUri)) {
      return requestUriAsBlob(fileUri);
    }
    throw fetchError;
  }
}

/** 반려견 목록 조회 */
export async function getDogs(userId: string): Promise<Dog[]> {
  const { data, error } = await supabase
    .from('dogs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data as Dog[];
}

/** 반려견 상세 조회 */
export async function getDog(dogId: string): Promise<Dog> {
  const { data, error } = await supabase.from('dogs').select('*').eq('id', dogId).single();
  if (error) throw error;
  return data as Dog;
}

/** 반려견 환경 조회 */
export async function getDogEnv(dogId: string): Promise<DogEnv | null> {
  return measureStartupAsync(
    'api_dog_env_supabase',
    { dogId },
    async () => {
      const { data, error } = await supabase.from('dog_env').select('*').eq('dog_id', dogId).single();
      if (error && error.code !== 'PGRST116') throw error;
      return data as DogEnv | null;
    },
  );
}

type DogEnvUpdate = Partial<
  Pick<DogEnv, 'household_info' | 'health_meta' | 'triggers' | 'past_attempts' | 'temperament' | 'activity_meta' | 'rewards_meta'>
>;

/** 반려견 환경/맥락 수정 */
export async function updateDogEnv(dogId: string, updates: DogEnvUpdate): Promise<DogEnv> {
  const { data, error } = await supabase
    .from('dog_env')
    .upsert(
      {
        dog_id: dogId,
        ...updates,
      },
      { onConflict: 'dog_id' },
    )
    .select()
    .single();

  if (error) throw error;
  return data as DogEnv;
}

/** 반려견 프로필 사진 업로드 */
export async function uploadDogProfileImage(userId: string, dogId: string, fileUri: string): Promise<string> {
  const { extension, contentType } = getImageUploadMeta(fileUri);
  const imageBody = await readImageBody(fileUri);
  const fileName = `${userId}/${dogId}-${Date.now()}.${extension}`;
  const filePath = fileName;

  const { error: uploadError } = await supabase.storage
    .from('dog-profiles')
    .upload(filePath, imageBody, {
      contentType,
      upsert: true,
    });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from('dog-profiles').getPublicUrl(filePath);
  return data.publicUrl;
}

/** 설문 기반 반려견 등록 */
export async function createDogFromSurvey(userId: string, survey: SurveyData): Promise<Dog> {
  const { data: dog, error: dogError } = await supabase
    .from('dogs')
    .insert({
      user_id: userId,
      name: survey.step1_basic.name,
      breed: survey.step1_basic.breed,
      sex: survey.step1_basic.sex,
    })
    .select()
    .single();
  if (dogError) throw dogError;

  // 사진이 있는 경우 업로드 및 업데이트
  if (survey.step1_basic.profile_image_url) {
    try {
      const publicUrl = await uploadDogProfileImage(userId, dog.id, survey.step1_basic.profile_image_url);
      await supabase.from('dogs').update({ profile_image_url: publicUrl }).eq('id', dog.id);
      dog.profile_image_url = publicUrl;
    } catch (e) {
      console.error('[API-001] Profile image upload failed:', e);
    }
  }

  const envData = mapSurveyToDogEnv(survey, dog.id);
  const { error: envError } = await supabase
    .from('dog_env')
    .insert(envData);

  if (envError) {
    console.error('[API-001] Failed to create dog_env:', envError);
    // 선택적: 생성된 dog 롤백 로직을 추가하거나 throw 할 수 있으나 일단 진행 허용
  }

  return dog as Dog;
}

/** 반려견 수정 */
export async function updateDog(dogId: string, updates: Partial<Dog>): Promise<Dog> {
  const { data, error } = await supabase
    .from('dogs')
    .update(updates)
    .eq('id', dogId)
    .select()
    .single();
  if (error) throw error;
  return data as Dog;
}

/** 반려견 삭제 */
export async function deleteDog(dogId: string): Promise<void> {
  const { error } = await supabase.from('dogs').delete().eq('id', dogId);
  if (error) throw error;
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
