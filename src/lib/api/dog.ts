/**
 * 반려견 API — CRUD + 환경 데이터
 * Parity: APP-001
 */
import { supabase } from './supabase';
import type { Dog, DogEnv, SurveyData } from 'types/dog';
import { mapSurveyToDogEnv } from 'components/features/survey/survey-mapper';

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
  const { data, error } = await supabase.from('dog_env').select('*').eq('dog_id', dogId).single();
  if (error && error.code !== 'PGRST116') throw error;
  return data as DogEnv | null;
}

/** 반려견 프로필 사진 업로드 */
export async function uploadDogProfileImage(userId: string, dogId: string, fileUri: string): Promise<string> {
  // react-native 환경에서 파일을 fetch하여 blob으로 변환
  const response = await fetch(fileUri);
  const blob = await response.blob();
  const fileExt = fileUri.split('.').pop();
  const fileName = `${userId}/${dogId}-${Date.now()}.${fileExt}`;
  const filePath = `dog-profiles/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('dog-profiles')
    .upload(filePath, blob, {
      contentType: 'image/*',
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
