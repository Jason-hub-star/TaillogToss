/**
 * PresetChipGrid — 프리셋 칩 그리드 (카테고리별 원탭 기록)
 * Parity: B2B-001
 */
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import {
  PRESET_CATEGORIES,
  PRESET_OPTIONS,
  type PresetOption,
  type PresetCategory,
} from 'lib/data/presets';

interface PresetChipGridProps {
  onSelect: (preset: PresetOption) => void;
  selectedId?: string;
}

export function PresetChipGrid({ onSelect, selectedId }: PresetChipGridProps) {
  const [activeCategory, setActiveCategory] = useState<PresetCategory>('walk');

  const filteredPresets = PRESET_OPTIONS.filter((p) => p.category === activeCategory);

  const handleCategoryPress = useCallback((key: PresetCategory) => {
    setActiveCategory(key);
  }, []);

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryRow}>
        {PRESET_CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat.key}
            style={[styles.categoryChip, activeCategory === cat.key && styles.categoryActive]}
            onPress={() => handleCategoryPress(cat.key)}
            activeOpacity={0.7}
          >
            <Text style={styles.categoryIcon}>{cat.icon}</Text>
            <Text
              style={[
                styles.categoryLabel,
                activeCategory === cat.key && styles.categoryLabelActive,
              ]}
            >
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.chipGrid}>
        {filteredPresets.map((preset) => (
          <TouchableOpacity
            key={preset.id}
            style={[styles.chip, selectedId === preset.id && styles.chipSelected]}
            onPress={() => onSelect(preset)}
            activeOpacity={0.7}
          >
            <Text style={[styles.chipText, selectedId === preset.id && styles.chipTextSelected]}>
              {preset.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  categoryRow: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F4F4F5',
    marginRight: 8,
  },
  categoryActive: {
    backgroundColor: '#0064FF',
  },
  categoryIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  categoryLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  categoryLabelActive: {
    color: '#FFFFFF',
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F4F4F5',
    borderWidth: 1,
    borderColor: '#E5E8EB',
  },
  chipSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: '#0064FF',
  },
  chipText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
  },
  chipTextSelected: {
    color: '#0064FF',
  },
});
