/**
 * 설정 API — 알림 선호도, AI 페르소나
 * Parity: APP-001
 */
import { supabase } from './supabase';
import { requestBackend, withBackendFallback } from './backend';
import type { UserSettings } from 'types/settings';
import { DEFAULT_NOTIFICATION_PREF, DEFAULT_AI_PERSONA } from 'types/settings';

interface BackendSettingsResponse {
  notification_pref?: UserSettings['notification_pref'];
  ai_persona?: UserSettings['ai_persona'];
}

function mapBackendSettings(row: BackendSettingsResponse | null | undefined): UserSettings {
  return {
    notification_pref: row?.notification_pref ?? DEFAULT_NOTIFICATION_PREF,
    ai_persona: row?.ai_persona ?? DEFAULT_AI_PERSONA,
    language: 'ko',
  };
}

/** 설정 조회 */
export async function getSettings(userId: string): Promise<UserSettings> {
  return withBackendFallback(
    async () => {
      const data = await requestBackend<BackendSettingsResponse>('/api/v1/settings/');
      return mapBackendSettings(data);
    },
    async () => {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      if (!data) {
        return {
          notification_pref: DEFAULT_NOTIFICATION_PREF,
          ai_persona: DEFAULT_AI_PERSONA,
          language: 'ko',
        };
      }
      return data as UserSettings;
    },
  );
}

/** 설정 업데이트 */
export async function updateSettings(
  userId: string,
  updates: Partial<UserSettings>
): Promise<UserSettings> {
  return withBackendFallback(
    async () => {
      const data = await requestBackend<BackendSettingsResponse, Partial<UserSettings>>('/api/v1/settings/', {
        method: 'PATCH',
        body: updates,
      });
      return mapBackendSettings(data);
    },
    async () => {
      const { data, error } = await supabase
        .from('user_settings')
        .upsert({ user_id: userId, ...updates }, { onConflict: 'user_id' })
        .select()
        .single();
      if (error) throw error;
      return data as UserSettings;
    },
  );
}
