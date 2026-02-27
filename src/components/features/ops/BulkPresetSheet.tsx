/**
 * BulkPresetSheet — 벌크 프리셋 선택 바텀시트 (선택된 N마리 일괄 기록)
 * Parity: B2B-001
 */
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { PresetChipGrid } from './PresetChipGrid';
import type { PresetOption } from 'lib/data/presets';

interface BulkPresetSheetProps {
  selectedDogNames: string[];
  onSave: (presetId: string, memo: string, intensity: number) => void;
  onClose: () => void;
}

export function BulkPresetSheet({ selectedDogNames, onSave, onClose }: BulkPresetSheetProps) {
  const [selectedPreset, setSelectedPreset] = useState<PresetOption | null>(null);

  const handlePresetSelect = useCallback((preset: PresetOption) => {
    setSelectedPreset(preset);
  }, []);

  const handleSave = useCallback(() => {
    if (!selectedPreset) return;
    onSave(selectedPreset.id, selectedPreset.defaultMemo, selectedPreset.defaultIntensity);
  }, [selectedPreset, onSave]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>일괄 기록</Text>
        <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
          <Text style={styles.closeBtn}>{'\u2715'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.selectedInfo}>
        <Text style={styles.selectedText}>
          {selectedDogNames.length}마리: {selectedDogNames.slice(0, 3).join(', ')}
          {selectedDogNames.length > 3 && ` 외 ${selectedDogNames.length - 3}마리`}
        </Text>
      </View>

      <ScrollView style={styles.body}>
        <PresetChipGrid onSelect={handlePresetSelect} selectedId={selectedPreset?.id} />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveBtn, !selectedPreset && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={!selectedPreset}
          activeOpacity={0.8}
        >
          <Text style={styles.saveBtnText}>
            {selectedDogNames.length}마리 일괄 저장
          </Text>
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
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#202632',
  },
  closeBtn: {
    fontSize: 20,
    color: '#8B95A1',
    padding: 4,
  },
  selectedInfo: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#F9FAFB',
  },
  selectedText: {
    fontSize: 13,
    color: '#6B7280',
  },
  body: {
    flex: 1,
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E8EB',
  },
  saveBtn: {
    backgroundColor: '#0064FF',
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
    color: '#FFFFFF',
  },
});
