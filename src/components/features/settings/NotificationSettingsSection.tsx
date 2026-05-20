import React from 'react';
import type { NotificationPref } from 'types/settings';
import { SettingsSectionCard } from './SettingsSectionCard';
import { SettingsToggleRow } from './SettingsToggleRow';
import { SettingsDivider } from './SettingsDivider';

interface NotificationSettingsSectionProps {
  notifPref: NotificationPref;
  marketingAgreed: boolean;
  onToggleImportant: () => void;
  onTogglePromo: () => void;
}

export function NotificationSettingsSection({
  notifPref,
  marketingAgreed,
  onToggleImportant,
  onTogglePromo,
}: NotificationSettingsSectionProps) {
  const importantEnabled =
    notifPref.channels.smart_message &&
    (
      notifPref.types.log_reminder ||
      notifPref.types.surge_alert ||
      notifPref.types.coaching_ready ||
      notifPref.types.training_reminder
    );

  return (
    <SettingsSectionCard title="알림 설정">
      <SettingsToggleRow
        label="중요 알림"
        description="기록 리마인더, 코칭 완료, 훈련 알림을 함께 관리해요."
        value={importantEnabled}
        onToggle={onToggleImportant}
      />
      <SettingsDivider />
      <SettingsToggleRow
        label="혜택/이벤트 알림"
        description="할인, 이벤트, 유료 기능 혜택 소식을 받아요."
        value={notifPref.types.promo && marketingAgreed}
        onToggle={onTogglePromo}
      />
    </SettingsSectionCard>
  );
}
