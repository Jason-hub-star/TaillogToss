/**
 * DateTimePicker — TDS 갭 보완, SegmentedControl 조합
 * 기록 발생 시각 선택에 사용 (네이티브 DatePicker 불가 → 커스텀)
 */
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import { colors, typography, spacing } from '../../styles/tokens';

export interface DateTimePickerProps {
  value: Date;
  onChange: (date: Date) => void;
  mode?: 'date' | 'time' | 'datetime';
}

export function DateTimePicker({ value, onChange, mode = 'datetime' }: DateTimePickerProps) {
  const [selectedDate, setSelectedDate] = useState(value);
  const [period, setPeriod] = useState<'am' | 'pm'>(value.getHours() >= 12 ? 'pm' : 'am');
  const [hourText, setHourText] = useState(String(toDisplayHour(value.getHours())));
  const [minuteText, setMinuteText] = useState(String(value.getMinutes()).padStart(2, '0'));

  useEffect(() => {
    setSelectedDate(value);
    setPeriod(value.getHours() >= 12 ? 'pm' : 'am');
    setHourText(String(toDisplayHour(value.getHours())));
    setMinuteText(String(value.getMinutes()).padStart(2, '0'));
  }, [value]);

  const quickOptions = [
    { label: '방금', offset: 0 },
    { label: '30분 전', offset: -30 },
    { label: '1시간 전', offset: -60 },
  ];

  const emitTimeChange = (nextPeriod: 'am' | 'pm', nextHourText: string, nextMinuteText: string) => {
    const displayHour = clampNumber(Number(nextHourText), 1, 12);
    const minute = clampNumber(Number(nextMinuteText), 0, 59);
    const next = new Date(selectedDate);
    next.setHours(to24Hour(displayHour, nextPeriod), minute, 0, 0);
    setSelectedDate(next);
    onChange(next);
  };

  const handlePeriodSelect = (nextPeriod: 'am' | 'pm') => {
    setPeriod(nextPeriod);
    emitTimeChange(nextPeriod, hourText, minuteText);
  };

  const handleHourChange = (text: string) => {
    const next = text.replace(/\D/g, '').slice(0, 2);
    setHourText(next);
    if (next) emitTimeChange(period, next, minuteText || '0');
  };

  const handleMinuteChange = (text: string) => {
    const next = text.replace(/\D/g, '').slice(0, 2);
    setMinuteText(next);
    if (next) emitTimeChange(period, hourText || '12', next);
  };

  const handleQuickSelect = (offsetMinutes: number) => {
    const next = new Date();
    next.setMinutes(next.getMinutes() + offsetMinutes);
    setSelectedDate(next);
    onChange(next);
  };

  return (
    <View style={styles.container}>
      <View style={styles.quickRow}>
        {quickOptions.map((opt) => (
          <TouchableOpacity key={opt.label} style={styles.quickChip} onPress={() => handleQuickSelect(opt.offset)}>
            <Text style={styles.quickText}>{opt.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {(mode === 'time' || mode === 'datetime') && (
        <View style={styles.inputRow}>
          <View style={styles.periodGroup}>
            {(['am', 'pm'] as const).map((item) => (
              <TouchableOpacity
                key={item}
                style={[styles.periodButton, period === item && styles.periodButtonSelected]}
                onPress={() => handlePeriodSelect(item)}
                activeOpacity={0.8}
              >
                <Text style={[styles.periodText, period === item && styles.periodTextSelected]}>
                  {item === 'am' ? '오전' : '오후'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            style={styles.timeInput}
            value={hourText}
            onChangeText={handleHourChange}
            onBlur={() => {
              const normalized = String(clampNumber(Number(hourText || '12'), 1, 12));
              setHourText(normalized);
              emitTimeChange(period, normalized, minuteText || '0');
            }}
            keyboardType="number-pad"
            maxLength={2}
            selectTextOnFocus
          />
          <Text style={styles.unitText}>시</Text>
          <Text style={styles.separator}>:</Text>
          <TextInput
            style={styles.timeInput}
            value={minuteText}
            onChangeText={handleMinuteChange}
            onBlur={() => {
              const normalized = String(clampNumber(Number(minuteText || '0'), 0, 59)).padStart(2, '0');
              setMinuteText(normalized);
              emitTimeChange(period, hourText || '12', normalized);
            }}
            keyboardType="number-pad"
            maxLength={2}
            selectTextOnFocus
          />
          <Text style={styles.unitText}>분</Text>
        </View>
      )}
    </View>
  );
}

function toDisplayHour(hour24: number): number {
  const hour = hour24 % 12;
  return hour === 0 ? 12 : hour;
}

function to24Hour(hour12: number, period: 'am' | 'pm'): number {
  if (period === 'am') return hour12 === 12 ? 0 : hour12;
  return hour12 === 12 ? 12 : hour12 + 12;
}

function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.sm,
  },
  quickRow: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  quickChip: {
    paddingHorizontal: 14,
    paddingVertical: spacing.sm,
    backgroundColor: colors.divider,
    borderRadius: 16,
    marginRight: spacing.sm,
  },
  quickText: {
    ...typography.detail,
    color: colors.grey700,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  periodGroup: {
    flexDirection: 'row',
    backgroundColor: colors.divider,
    borderRadius: 10,
    padding: 3,
    marginRight: spacing.sm,
  },
  periodButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 8,
  },
  periodButtonSelected: {
    backgroundColor: colors.white,
  },
  periodText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  periodTextSelected: {
    color: colors.primaryBlue,
  },
  timeInput: {
    width: 48,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    textAlign: 'center',
    ...typography.detail,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  unitText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  separator: {
    ...typography.subtitle,
    fontWeight: '600',
    color: colors.textDark,
    marginHorizontal: spacing.xs,
  },
});
