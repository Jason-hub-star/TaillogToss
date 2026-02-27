/**
 * RecordModal — 개별 기록 바텀시트 (프리셋 칩 + 메모 + "저장 & 다음")
 * Parity: B2B-001
 */
import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { PresetChipGrid } from './PresetChipGrid';
import type { PresetOption } from 'lib/data/presets';
import type { OpsItem } from './OpsListItem';

interface RecordModalProps {
  item: OpsItem;
  onSave: (data: { dogId: string; presetId: string; memo: string; intensity: number }) => void;
  onSaveAndNext: (data: { dogId: string; presetId: string; memo: string; intensity: number }) => void;
  onClose: () => void;
}

export function RecordModal({ item, onSave, onSaveAndNext, onClose }: RecordModalProps) {
  const [selectedPreset, setSelectedPreset] = useState<PresetOption | null>(null);
  const [memo, setMemo] = useState('');

  const handlePresetSelect = useCallback((preset: PresetOption) => {
    setSelectedPreset(preset);
    setMemo(preset.defaultMemo);
  }, []);

  const buildPayload = useCallback(() => {
    if (!selectedPreset) return null;
    return {
      dogId: item.dogId,
      presetId: selectedPreset.id,
      memo,
      intensity: selectedPreset.defaultIntensity,
    };
  }, [selectedPreset, memo, item.dogId]);

  const handleSave = useCallback(() => {
    const payload = buildPayload();
    if (payload) onSave(payload);
  }, [buildPayload, onSave]);

  const handleSaveAndNext = useCallback(() => {
    const payload = buildPayload();
    if (payload) onSaveAndNext(payload);
  }, [buildPayload, onSaveAndNext]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerInfo}>
          <Text style={styles.dogName}>{item.dogName}</Text>
          {item.parentName && <Text style={styles.parentName}>{item.parentName}</Text>}
        </View>
        <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
          <Text style={styles.closeBtn}>{'\u2715'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
        <PresetChipGrid onSelect={handlePresetSelect} selectedId={selectedPreset?.id} />

        <View style={styles.memoSection}>
          <Text style={styles.memoLabel}>메모</Text>
          <TextInput
            style={styles.memoInput}
            value={memo}
            onChangeText={setMemo}
            placeholder="추가 메모 (선택)"
            multiline
            numberOfLines={3}
          />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveBtn, !selectedPreset && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={!selectedPreset}
          activeOpacity={0.8}
        >
          <Text style={styles.saveBtnText}>저장</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.saveNextBtn, !selectedPreset && styles.saveBtnDisabled]}
          onPress={handleSaveAndNext}
          disabled={!selectedPreset}
          activeOpacity={0.8}
        >
          <Text style={styles.saveNextBtnText}>저장 & 다음</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E8EB',
  },
  headerInfo: {
    flex: 1,
  },
  dogName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#202632',
  },
  parentName: {
    fontSize: 13,
    color: '#8B95A1',
    marginTop: 2,
  },
  closeBtn: {
    fontSize: 20,
    color: '#8B95A1',
    padding: 4,
  },
  body: {
    flex: 1,
  },
  memoSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  memoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  memoInput: {
    borderWidth: 1,
    borderColor: '#E5E8EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#202632',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E8EB',
  },
  saveBtn: {
    flex: 1,
    backgroundColor: '#F4F4F5',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.5,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  saveNextBtn: {
    flex: 1,
    backgroundColor: '#0064FF',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveNextBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
