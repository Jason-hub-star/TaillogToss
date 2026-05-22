/**
 * Referral reward API — contactsViral PRO 1일권
 * Parity: GROWTH-001, IAP-001
 */
import { requestBackend } from './backend';

export const CONTACTS_VIRAL_PRO_DAY_PASS_MODULE_ID =
  process.env.EXPO_PUBLIC_CONTACTS_VIRAL_PRO_DAY_PASS_MODULE_ID ?? '';

export interface ContactsViralRewardRequest {
  module_id: string;
  reward_amount?: number;
  reward_unit?: string;
  event_type?: 'sendViral';
}

export interface ContactsViralRewardResponse {
  granted: boolean;
  already_granted: boolean;
  entitlement_type: 'PRO_DAY_PASS';
  effective_is_pro: boolean;
  effective_pro_source: 'pro_day_pass';
  effective_pro_expires_at: string;
}

export function grantContactsViralProDayPass(
  request: ContactsViralRewardRequest,
): Promise<ContactsViralRewardResponse> {
  return requestBackend<ContactsViralRewardResponse, ContactsViralRewardRequest>(
    '/api/v1/referral/reward/contacts-viral',
    {
      method: 'POST',
      body: {
        ...request,
        event_type: 'sendViral',
      },
    },
  );
}
