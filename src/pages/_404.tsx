/**
 * 404 라우트 — 알 수 없는 경로 진입 시 로그인으로 리다이렉트한다.
 * Parity: APP-001
 */
import { createRoute, useNavigation } from '@granite-js/react-native';
import React, { useEffect } from 'react';
import { Text, View } from 'react-native';

export const Route = createRoute('/_404', {
  component: NotFoundPage,
});

function NotFoundPage() {
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
      <Text>404 Not Found</Text>
    </View>
  );
}
