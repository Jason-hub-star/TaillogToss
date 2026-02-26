/**
 * 최초 환영 화면 — 가치 제안 카드 + "시작하기 (90초)" CTA
 * 최초 1회만 표시. welcome → survey 전환
 * Parity: AUTH-001
 */
import { createRoute } from '@granite-js/react-native';
import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';

export const Route = createRoute('/onboarding/welcome', {
  component: WelcomePage,
});

function WelcomePage() {
  const handleStart = () => {
    // TODO: navigation.push('/onboarding/survey') — Phase 10 가드 연결
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Lottie 영역 (placeholder) */}
        <View style={styles.heroSection}>
          <View style={styles.lottieArea}>
            <Text style={styles.lottieEmoji}>🐕</Text>
          </View>

          <Text style={styles.heading}>반려견 행동,{'\n'}90초면 기록 끝</Text>
          <Text style={styles.subtitle}>AI가 분석하고,{'\n'}맞춤 훈련까지</Text>

          {/* 특징 카드 3개 */}
          <View style={styles.features}>
            <View style={styles.featureCard}>
              <Text style={styles.featureIcon}>⚡</Text>
              <Text style={styles.featureTitle}>원탭 기록</Text>
              <Text style={styles.featureDesc}>간단한 칩 터치로 빠르게</Text>
            </View>
            <View style={styles.featureCard}>
              <Text style={styles.featureIcon}>📊</Text>
              <Text style={styles.featureTitle}>AI 분석</Text>
              <Text style={styles.featureDesc}>패턴과 트리거를 자동 분석</Text>
            </View>
            <View style={styles.featureCard}>
              <Text style={styles.featureIcon}>🎯</Text>
              <Text style={styles.featureTitle}>맞춤 훈련</Text>
              <Text style={styles.featureDesc}>7종 커리큘럼 맞춤 추천</Text>
            </View>
          </View>
        </View>

        {/* Bottom CTA */}
        <View style={styles.bottomSection}>
          <TouchableOpacity style={styles.ctaButton} onPress={handleStart} activeOpacity={0.8}>
            <Text style={styles.ctaText}>시작하기 (90초)</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  container: {
    flex: 1,
    justifyContent: 'space-between',
  },
  heroSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  lottieArea: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F0F4FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  lottieEmoji: { fontSize: 56 },
  heading: {
    fontSize: 26,
    fontWeight: '700',
    color: '#202632',
    textAlign: 'center',
    lineHeight: 36,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#8B95A1',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 36,
  },
  features: {
    flexDirection: 'row',
    gap: 12,
  },
  featureCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  featureIcon: { fontSize: 24, marginBottom: 8 },
  featureTitle: { fontSize: 13, fontWeight: '700', color: '#333D4B', marginBottom: 4 },
  featureDesc: { fontSize: 11, color: '#8B95A1', textAlign: 'center' },
  bottomSection: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    paddingBottom: 24,
  },
  ctaButton: {
    backgroundColor: '#0064FF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
});
