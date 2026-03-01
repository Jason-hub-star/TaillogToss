/**
 * TabLayout (패턴D) — 탭형 레이아웃
 * 대시보드 3탭, 분석 주간/월간/전체 등에 사용
 */
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, typography, spacing } from '../../../styles/tokens';

export interface TabItem {
  key: string;
  label: string;
  content: React.ReactNode;
}

export interface TabLayoutProps {
  title?: string;
  tabs: TabItem[];
  defaultTab?: string;
  headerRight?: React.ReactNode;
}

export function TabLayout({ title, tabs, defaultTab, headerRight }: TabLayoutProps) {
  const [activeTab, setActiveTab] = useState(defaultTab ?? tabs[0]?.key ?? '');
  const activeContent = tabs.find((t) => t.key === activeTab)?.content;

  return (
    <View style={styles.safe}>
      {title && (
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          {headerRight && <View>{headerRight}</View>}
        </View>
      )}
      <View style={styles.tabBar}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.content}>{activeContent}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.screenHorizontal,
    paddingVertical: spacing.lg,
  },
  title: { ...typography.sectionTitle, fontWeight: '700', color: colors.textPrimary },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.screenHorizontal,
  },
  tab: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginRight: spacing.xs,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primaryBlue,
  },
  tabText: { ...typography.bodySmall, color: colors.textSecondary },
  tabTextActive: { color: colors.primaryBlue, fontWeight: '600' },
  content: { flex: 1 },
});
