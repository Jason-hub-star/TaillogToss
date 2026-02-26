/**
 * Step 7: AI 코칭 선호도 (톤, 관점, 알림 동의)
 * Parity: AUTH-001
 */
import React from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';
import { ChipGroup } from 'components/tds-ext';
import type { SurveyStep7 } from 'types/dog';

const TONE_OPTIONS = [
  { key: 'empathetic', label: '공감형 🤗' },
  { key: 'solution', label: '솔루션형 💡' },
];

const PERSPECTIVE_OPTIONS = [
  { key: 'coach', label: '코치 시점 🧑‍🏫' },
  { key: 'dog', label: '강아지 시점 🐶' },
];

interface Props {
  value?: SurveyStep7;
  onChange: (v: SurveyStep7) => void;
}

export function Step7Preferences({ value, onChange }: Props) {
  const current: SurveyStep7 = value ?? {
    ai_tone: 'empathetic',
    ai_perspective: 'coach',
    notification_consent: true,
  };

  return (
    <View>
      <Text style={styles.title}>AI 코칭 스타일을 선택해주세요</Text>

      <Text style={styles.label}>코칭 톤</Text>
      <Text style={styles.description}>
        공감형은 감정에 초점, 솔루션형은 행동 해결에 초점을 맞춥니다
      </Text>
      <ChipGroup
        items={TONE_OPTIONS}
        selectedKeys={[current.ai_tone]}
        onSelect={(key) =>
          onChange({ ...current, ai_tone: key as SurveyStep7['ai_tone'] })
        }
      />

      <Text style={[styles.label, { marginTop: 24 }]}>코칭 관점</Text>
      <Text style={styles.description}>
        코치 시점은 전문가 조언, 강아지 시점은 반려견의 마음을 전달합니다
      </Text>
      <ChipGroup
        items={PERSPECTIVE_OPTIONS}
        selectedKeys={[current.ai_perspective]}
        onSelect={(key) =>
          onChange({ ...current, ai_perspective: key as SurveyStep7['ai_perspective'] })
        }
      />

      <View style={styles.switchRow}>
        <View style={styles.switchTextWrap}>
          <Text style={styles.switchLabel}>알림 수신 동의</Text>
          <Text style={styles.switchDesc}>코칭 리마인더와 행동 변화 알림을 받습니다</Text>
        </View>
        <Switch
          value={current.notification_consent}
          onValueChange={(v) => onChange({ ...current, notification_consent: v })}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 18, fontWeight: '600', color: '#202632', marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#333D4B', marginBottom: 4 },
  description: { fontSize: 13, color: '#8B95A1', marginBottom: 12 },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 32,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E8EB',
  },
  switchTextWrap: { flex: 1, marginRight: 12 },
  switchLabel: { fontSize: 15, fontWeight: '600', color: '#333D4B' },
  switchDesc: { fontSize: 13, color: '#8B95A1', marginTop: 2 },
});
