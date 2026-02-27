/**
 * 공개 리포트 뷰어 — 비토스 공유 링크 (skipAuth)
 * 전화번호 뒷4자리 인증 → 리포트 열람
 * Parity: B2B-001
 */
import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, StyleSheet, SafeAreaView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { createRoute } from '@granite-js/react-native';
import { usePageGuard } from 'lib/hooks/usePageGuard';
import { useReportByShareToken, useCreateInteraction } from 'lib/hooks/useReport';
import { ReportViewer } from 'components/features/parent/ReportViewer';
import { ReactionForm } from 'components/features/parent/ReactionForm';
import { tracker } from 'lib/analytics/tracker';
import { supabase } from 'lib/api/supabase';

export const Route = createRoute('/report/[shareToken]', {
  validateParams: (params) => params as { shareToken: string },
  component: ShareTokenReportPage,
});

function ShareTokenReportPage() {
  const { shareToken } = Route.useParams();
  const { isReady } = usePageGuard({
    currentPath: '/report/[shareToken]' as any,
    skipAuth: true,
    skipOnboarding: true,
  });
  const { data: report, isLoading, error } = useReportByShareToken(shareToken);
  const createInteraction = useCreateInteraction();

  const [phoneLastFour, setPhoneLastFour] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [verifyError, setVerifyError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const handleVerify = useCallback(async () => {
    if (phoneLastFour.length !== 4) {
      setVerifyError('4자리 숫자를 입력해주세요');
      return;
    }
    setIsVerifying(true);
    setVerifyError('');
    try {
      // RPC 호출로 서버에서 뒷4자리 대조 (PII는 서버에서만 복호화)
      const { data, error: rpcError } = await supabase.rpc('verify_parent_phone_last4', {
        p_share_token: shareToken,
        p_last_four: phoneLastFour,
      });
      if (rpcError) throw rpcError;
      if (data === true) {
        setIsVerified(true);
      } else {
        setVerifyError('전화번호가 일치하지 않습니다');
      }
    } catch {
      setVerifyError('인증에 실패했습니다. 다시 시도해주세요');
    } finally {
      setIsVerifying(false);
    }
  }, [phoneLastFour, shareToken]);

  if (!isReady) return null;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#0064FF" />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !report) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.errorIcon}>{'\uD83D\uDD12'}</Text>
          <Text style={styles.errorTitle}>리포트를 찾을 수 없어요</Text>
          <Text style={styles.errorDesc}>링크가 만료되었거나 잘못된 주소입니다</Text>
        </View>
      </SafeAreaView>
    );
  }

  // 전화번호 인증 단계
  if (!isVerified) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.verifyContainer}>
          <Text style={styles.verifyIcon}>{'\uD83D\uDD10'}</Text>
          <Text style={styles.verifyTitle}>보호자 인증</Text>
          <Text style={styles.verifyDesc}>
            등록된 전화번호 뒷 4자리를 입력해주세요
          </Text>
          <TextInput
            style={styles.phoneInput}
            value={phoneLastFour}
            onChangeText={(t) => setPhoneLastFour(t.replace(/[^0-9]/g, '').slice(0, 4))}
            placeholder="0000"
            keyboardType="number-pad"
            maxLength={4}
            autoFocus
          />
          {verifyError ? <Text style={styles.verifyError}>{verifyError}</Text> : null}
          <TouchableOpacity
            style={[styles.verifyBtn, phoneLastFour.length < 4 && styles.verifyBtnDisabled]}
            onPress={handleVerify}
            disabled={phoneLastFour.length < 4 || isVerifying}
            activeOpacity={0.8}
          >
            <Text style={styles.verifyBtnText}>
              {isVerifying ? '확인 중...' : '확인'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // 인증 완료 → 리포트 표시
  return (
    <SafeAreaView style={styles.safe}>
      <ReportViewer report={report} />
      <ReactionForm
        onSubmitReaction={(emoji) => {
          createInteraction.mutate({
            report_id: report.id,
            parent_identifier: `phone_${phoneLastFour}`,
            interaction_type: 'like',
            content: emoji,
          });
          tracker.parentReaction('like');
        }}
        onSubmitQuestion={(question) => {
          createInteraction.mutate({
            report_id: report.id,
            parent_identifier: `phone_${phoneLastFour}`,
            interaction_type: 'question',
            content: question,
          });
          tracker.parentReaction('question');
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorIcon: { fontSize: 48, marginBottom: 16 },
  errorTitle: { fontSize: 18, fontWeight: '700', color: '#202632', marginBottom: 8 },
  errorDesc: { fontSize: 14, color: '#8B95A1', textAlign: 'center' },
  verifyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  verifyIcon: { fontSize: 48, marginBottom: 16 },
  verifyTitle: { fontSize: 20, fontWeight: '700', color: '#202632', marginBottom: 8 },
  verifyDesc: { fontSize: 14, color: '#8B95A1', textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  phoneInput: {
    width: 160, height: 56, borderWidth: 2, borderColor: '#E5E8EB', borderRadius: 12,
    fontSize: 24, fontWeight: '700', textAlign: 'center', color: '#202632',
    letterSpacing: 8,
  },
  verifyError: { fontSize: 13, color: '#DC2626', marginTop: 8 },
  verifyBtn: {
    width: 160, height: 48, backgroundColor: '#0064FF', borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', marginTop: 20,
  },
  verifyBtnDisabled: { backgroundColor: '#D1D5DB' },
  verifyBtnText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
});
