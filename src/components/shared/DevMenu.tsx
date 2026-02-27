/**
 * DevMenu — __DEV__ 전용 디버그 네비게이션 도구
 * 플로팅 버튼 → 모든 라우트 목록 → 탭하면 즉시 이동
 * 프로덕션 빌드에서는 tree-shaking으로 제거
 */
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@granite-js/react-native';
import { useAuth } from 'stores/AuthContext';

const DEV_ROUTES = [
  { path: '/login', label: 'Login', group: 'Auth' },
  { path: '/onboarding/welcome', label: 'Welcome', group: 'Onboarding' },
  { path: '/onboarding/survey', label: 'Survey', group: 'Onboarding' },
  { path: '/onboarding/survey-result', label: 'Survey Result', group: 'Onboarding' },
  { path: '/onboarding/notification', label: 'Notification', group: 'Onboarding' },
  { path: '/dashboard', label: 'Dashboard', group: 'Main' },
  { path: '/dashboard/quick-log', label: 'Quick Log', group: 'Main' },
  { path: '/dashboard/analysis', label: 'Analysis', group: 'Main' },
  { path: '/coaching/result', label: 'Coaching Result', group: 'Main' },
  { path: '/training/academy', label: 'Academy', group: 'Training' },
  { path: '/training/detail', label: 'Training Detail', group: 'Training' },
  { path: '/dog/profile', label: 'Dog Profile', group: 'Dog' },
  { path: '/dog/add', label: 'Dog Add', group: 'Dog' },
  { path: '/dog/switcher', label: 'Dog Switcher', group: 'Dog' },
  { path: '/settings', label: 'Settings', group: 'Settings' },
  { path: '/settings/subscription', label: 'Subscription', group: 'Settings' },
  { path: '/legal/terms', label: 'Terms', group: 'Legal' },
  { path: '/legal/privacy', label: 'Privacy', group: 'Legal' },
  { path: '/ops/today', label: 'Ops Today', group: 'B2B' },
  { path: '/ops/settings', label: 'Ops Settings', group: 'B2B' },
  { path: '/parent/reports', label: 'Parent Reports', group: 'B2B' },
] as const;

const GROUP_COLORS: Record<string, string> = {
  Auth: '#E5503C',
  Onboarding: '#FF8800',
  Main: '#0064FF',
  Training: '#00B386',
  Dog: '#8B5CF6',
  Settings: '#6B7280',
  Legal: '#9CA3AF',
  B2B: '#EC4899',
};

export function DevMenu() {
  const [visible, setVisible] = useState(false);
  const navigation = useNavigation();
  const { user } = useAuth();

  const handleNavigate = useCallback(
    (path: string) => {
      setVisible(false);
      navigation.navigate(path as never);
    },
    [navigation],
  );

  return (
    <>
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setVisible(true)}
        activeOpacity={0.8}
      >
        <Text style={styles.fabText}>DEV</Text>
      </TouchableOpacity>

      <Modal visible={visible} animationType="slide" transparent={false}>
        <SafeAreaView style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Dev Navigator</Text>
            <TouchableOpacity onPress={() => setVisible(false)}>
              <Text style={styles.close}>X</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.userInfo}>
            <Text style={styles.infoText}>
              User: {user?.id?.slice(0, 8) ?? 'none'} | Role: {user?.role ?? '-'}
            </Text>
          </View>

          <ScrollView style={styles.list}>
            {DEV_ROUTES.map((route) => (
              <TouchableOpacity
                key={route.path}
                style={styles.item}
                onPress={() => handleNavigate(route.path)}
                activeOpacity={0.6}
              >
                <View
                  style={[
                    styles.badge,
                    { backgroundColor: GROUP_COLORS[route.group] ?? '#6B7280' },
                  ]}
                >
                  <Text style={styles.badgeText}>{route.group}</Text>
                </View>
                <View style={styles.itemContent}>
                  <Text style={styles.itemLabel}>{route.label}</Text>
                  <Text style={styles.itemPath}>{route.path}</Text>
                </View>
                <Text style={styles.chevron}>{'>'}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 100,
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FF3B30',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    zIndex: 9999,
  },
  fabText: { color: '#FFF', fontSize: 11, fontWeight: '800' },
  modal: { flex: 1, backgroundColor: '#F8F9FA' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E8EB',
  },
  title: { fontSize: 18, fontWeight: '700', color: '#191F28' },
  close: { fontSize: 18, fontWeight: '600', color: '#8B95A1', padding: 4 },
  userInfo: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFF3CD',
  },
  infoText: { fontSize: 12, color: '#856404', fontFamily: 'monospace' },
  list: { flex: 1 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F2F4F6',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginRight: 12,
    minWidth: 60,
    alignItems: 'center',
  },
  badgeText: { color: '#FFF', fontSize: 10, fontWeight: '700' },
  itemContent: { flex: 1 },
  itemLabel: { fontSize: 15, fontWeight: '600', color: '#191F28' },
  itemPath: { fontSize: 12, color: '#8B95A1', marginTop: 2 },
  chevron: { fontSize: 16, color: '#8B95A1' },
});
