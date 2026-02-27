/**
 * PresetManager — 프리셋 커스텀 관리 (조직별 추가/삭제)
 * Parity: B2B-001
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { PRESET_CATEGORIES, PRESET_OPTIONS, type PresetOption } from 'lib/data/presets';

interface PresetManagerProps {
  customPresets?: PresetOption[];
  onAddPreset?: () => void;
  onRemovePreset?: (presetId: string) => void;
}

export function PresetManager({ customPresets = [], onAddPreset, onRemovePreset }: PresetManagerProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>프리셋 관리</Text>
        {onAddPreset && (
          <TouchableOpacity onPress={onAddPreset} activeOpacity={0.7}>
            <Text style={styles.addBtn}>+ 추가</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView>
        {PRESET_CATEGORIES.map((cat) => {
          const presets = PRESET_OPTIONS.filter((p) => p.category === cat.key);
          const custom = customPresets.filter((p) => p.category === cat.key);
          const all = [...presets, ...custom];

          return (
            <View key={cat.key} style={styles.categorySection}>
              <Text style={styles.categoryTitle}>{cat.icon} {cat.label} ({all.length}개)</Text>
              {all.map((preset) => (
                <View key={preset.id} style={styles.presetRow}>
                  <Text style={styles.presetLabel}>{preset.label}</Text>
                  <Text style={styles.presetIntensity}>강도 {preset.defaultIntensity}</Text>
                  {custom.some((c) => c.id === preset.id) && onRemovePreset && (
                    <TouchableOpacity
                      onPress={() => onRemovePreset(preset.id)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.removeBtn}>삭제</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 12,
  },
  title: { fontSize: 16, fontWeight: '700', color: '#202632' },
  addBtn: { fontSize: 14, fontWeight: '600', color: '#0064FF' },
  categorySection: { paddingHorizontal: 20, paddingTop: 12 },
  categoryTitle: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  presetRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F2F3F5',
  },
  presetLabel: { flex: 1, fontSize: 14, color: '#202632' },
  presetIntensity: { fontSize: 12, color: '#8B95A1', marginRight: 12 },
  removeBtn: { fontSize: 12, color: '#DC2626', fontWeight: '600' },
});
