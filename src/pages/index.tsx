/**
 * 루트 라우트 — 앱 기본 진입 시 로그인 화면으로 리다이렉트한다.
 * Parity: APP-001
 */
import { createRoute, useNavigation } from '@granite-js/react-native';
import React, { useEffect } from 'react';
import { Text, View } from 'react-native';

export const Route = createRoute('/', {
  component: RootEntryPage,
});

function RootEntryPage() {
  const navigation = useNavigation();

  useEffect(() => {
    navigation.navigate('/login');
  }, [navigation]);

  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text>Loading...</Text>
    </View>
  );
}
