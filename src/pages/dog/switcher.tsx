/**
 * 반려견 전환 화면 — ModalLayout + DogSwitcherItem 목록 + 추가 버튼
 * Parity: APP-001
 */
import { createRoute, useNavigation } from '@granite-js/react-native';
import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, typography } from 'styles/tokens';
import { ModalLayout } from 'components/shared/layouts/ModalLayout';
import { DogSwitcherItem } from 'components/features/dog/DogSwitcherItem';
import { SkeletonBox } from 'components/tds-ext/SkeletonBox';
import { EmptyState, ErrorState } from 'components/tds-ext';
import { usePageGuard } from 'lib/hooks/usePageGuard';
import { useAuth } from 'stores/AuthContext';
import { useActiveDog } from 'stores/ActiveDogContext';
import { useIsPro } from 'lib/hooks/useSubscription';
import { useDogList } from 'lib/hooks/useDogs';
import type { Dog } from 'types/dog';

export const Route = createRoute('/dog/switcher', {
  component: DogSwitcherPage,
});

function DogSwitcherPage() {
  const { isReady } = usePageGuard({ currentPath: '/dog/switcher' });
  const { user } = useAuth();
  const { activeDog, setActiveDog, canAddDog } = useActiveDog();
  const isPro = useIsPro(user?.id);
  const { data: dogs, isLoading, isError, refetch } = useDogList(user?.id);
  const navigation = useNavigation();

  const handleSelect = useCallback((dog: Dog) => {
    setActiveDog(dog);
    navigation.goBack();
  }, [setActiveDog, navigation]);

  const handleAdd = useCallback(() => {
    navigation.navigate('/dog/add');
  }, [navigation]);

  const handleClose = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  if (!isReady) return null;

  const canAdd = canAddDog(isPro ?? false);

  return (
    <ModalLayout title="반려견 전환" onClose={handleClose}>
      {isLoading ? (
        <View style={styles.skeletonList}>
          {[1, 2, 3].map((i) => (
            <SkeletonBox key={i} width="100%" height={56} borderRadius={12} style={styles.skeletonGap} />
          ))}
        </View>
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : !dogs || dogs.length === 0 ? (
        <EmptyState
          title="반려견을 등록해보세요"
          description="반려견 정보를 등록하면 맞춤 코칭을 받을 수 있어요"
        />
      ) : (
        <>
          {dogs.map((dog) => (
            <DogSwitcherItem
              key={dog.id}
              dog={dog}
              isActive={dog.id === activeDog?.id}
              onPress={() => handleSelect(dog)}
            />
          ))}

          {/* 추가 버튼 */}
          <TouchableOpacity
            style={[styles.addButton, !canAdd && styles.addButtonDisabled]}
            onPress={handleAdd}
            activeOpacity={0.7}
            disabled={!canAdd}
          >
            <Text style={[styles.addIcon, !canAdd && styles.addTextDisabled]}>+</Text>
            <Text style={[styles.addText, !canAdd && styles.addTextDisabled]}>반려견 추가</Text>
          </TouchableOpacity>

          {!canAdd && (
            <Text style={styles.limitHint}>
              {isPro ? '최대 5마리까지 등록할 수 있어요' : 'PRO 구독으로 최대 5마리까지 등록하세요'}
            </Text>
          )}
        </>
      )}
    </ModalLayout>
  );
}

const styles = StyleSheet.create({
  skeletonList: {
    paddingVertical: 8,
  },
  skeletonGap: {
    marginBottom: 8,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primaryBlue,
    borderStyle: 'dashed',
  },
  addButtonDisabled: {
    borderColor: colors.grey300,
  },
  addIcon: {
    ...typography.subtitle,
    color: colors.primaryBlue,
    marginRight: 6,
  },
  addText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.primaryBlue,
  },
  addTextDisabled: {
    color: colors.grey400,
  },
  limitHint: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
});
