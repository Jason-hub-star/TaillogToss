/**
 * MarketingDataConsentSection — 마케팅 데이터 익명 활용 동의 섹션 (Phase 1B)
 * 잠금 L11: 동의자(marketing_data_consent=true) 의 익명화된 행동 데이터만
 *   `vw_marketing_behavior_improvement` 뷰에 노출. 동의 철회 시 즉시 풀에서 제외.
 *
 * 동의 범위:
 *   - 견종 카테고리 (소/중/대형)
 *   - 연령대 (퍼피/성견/노령견)
 *   - 행동 카테고리별 빈도·강도 변화
 *
 * 절대 노출 금지: 사용자명·반려견명·정확한 일시·세부 견종 (marketingPiiGuard 4중 방어)
 */
import React from 'react';
import { SettingsSectionCard } from './SettingsSectionCard';
import { SettingsToggleRow } from './SettingsToggleRow';

interface MarketingDataConsentSectionProps {
  marketingDataConsent: boolean;
  onToggle: () => void;
}

export function MarketingDataConsentSection({
  marketingDataConsent,
  onToggle,
}: MarketingDataConsentSectionProps) {
  return (
    <SettingsSectionCard title="데이터 활용 동의">
      <SettingsToggleRow
        label="익명 사례 활용 동의"
        description="견종 카테고리·연령대·행동 변화만 익명으로 활용해요. 이름·정확한 일시는 절대 표시하지 않아요. 언제든 끌 수 있어요."
        value={marketingDataConsent}
        onToggle={onToggle}
      />
    </SettingsSectionCard>
  );
}
