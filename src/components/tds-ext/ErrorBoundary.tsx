/**
 * ErrorBoundary — 앱 최상위 에러 복구 컴포넌트
 * 동기 렌더링 에러 catch → 에러 화면 + "홈으로" 탈출 보장
 * Parity: UI-001
 */
import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { SafeAreaView } from '@granite-js/native/react-native-safe-area-context';
import { colors, typography, spacing } from '../../styles/tokens';
import { ICONS } from 'lib/data/iconSources';

interface Props {
  children: ReactNode;
  onNavigateHome?: () => void;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, errorMessage: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error.message, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, errorMessage: '' });
    this.props.onNavigateHome?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView style={styles.safe}>
          <View style={styles.container}>
            <Image source={{ uri: ICONS['ic-bolt'] }} style={styles.iconImg} resizeMode="contain" />
            <Text style={styles.title}>문제가 발생했어요</Text>
            <Text style={styles.description}>
              예상하지 못한 문제가 생겼어요.{'\n'}
              홈으로 이동해 다시 시작해볼게요.
            </Text>
            <TouchableOpacity
              style={styles.button}
              onPress={this.handleReset}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonText}>홈으로</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxxl,
  },
  iconImg: {
    width: 56,
    height: 56,
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.sectionTitle,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  description: {
    ...typography.detail,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  button: {
    marginTop: spacing.xxl,
    backgroundColor: colors.primaryBlue,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    minWidth: 140,
    alignItems: 'center',
  },
  buttonText: {
    color: colors.white,
    ...typography.label,
    fontWeight: '600',
  },
});
