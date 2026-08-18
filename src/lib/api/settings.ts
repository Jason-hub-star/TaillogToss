/**
 * 설정 API — 알림 선호도, AI 페르소나
 * Parity: APP-001
 */
import { requestBackend } from './backend';
import type { UserSettings } from 'types/settings';
import { DEFAULT_NOTIFICATION_PREF, DEFAULT_AI_PERSONA } from 'types/settings';

interface BackendSettingsResponse {
  notification_pref?: UserSettings['notification_pref'];
  ai_persona?: UserSettings['ai_persona'];
  marketing_agreed?: boolean;
  marketing_agreed_at?: string | null;
  marketing_data_consent?: boolean;
  marketing_data_consent_at?: string | null;
}

function mapBackendSettings(row: BackendSettingsResponse | null | undefined): UserSettings {
  return {
    notification_pref: row?.notification_pref ?? DEFAULT_NOTIFICATION_PREF,
    ai_persona: row?.ai_persona ?? DEFAULT_AI_PERSONA,
    marketing_agreed: row?.marketing_agreed ?? false,
    marketing_agreed_at: row?.marketing_agreed_at ?? null,
    marketing_data_consent: row?.marketing_data_consent ?? false,
    marketing_data_consent_at: row?.marketing_data_consent_at ?? null,
    language: 'ko',
  };
}

/** 설정 조회 */
export async function getSettings(userId: string): Promise<UserSettings> {
  void userId;
  const data = await requestBackend<BackendSettingsResponse>('/api/v1/settings/');
  return mapBackendSettings(data);
}

/** 설정 업데이트 */
export async function updateSettings(
  userId: string,
  updates: Partial<UserSettings>
): Promise<UserSettings> {
  void userId;
  const data = await requestBackend<BackendSettingsResponse, Partial<UserSettings>>('/api/v1/settings/', {
    method: 'PATCH',
    body: updates,
  });
  return mapBackendSettings(data);
}
