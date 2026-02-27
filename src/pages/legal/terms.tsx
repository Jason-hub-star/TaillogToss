/**
 * 서비스 이용약관 페이지 — 로그인/설정에서 접근.
 * Edge Function legal?doc=terms 와 동일 내용을 네이티브로 렌더링.
 */
import { createRoute, useNavigation } from '@granite-js/react-native';
import React from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';

export const Route = createRoute('/legal/terms', {
  component: LegalTermsPage,
});

function LegalTermsPage() {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.navbar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>{'←'}</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>서비스 이용약관</Text>
        <View style={styles.backButton} />
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={styles.meta}>최종 수정일: 2026년 2월 27일 | 시행일: 2026년 2월 27일</Text>

        <Text style={styles.h2}>제 1 조 (목적)</Text>
        <Text style={styles.p}>
          본 약관은 테일로그(TailLog, 이하 "회사")가 토스 미니앱을 통해 제공하는 반려견 행동 기록 및 AI 코칭
          서비스(이하 "서비스")의 이용과 관련하여 회사와 이용자 간의 권리, 의무 및 책임사항, 기타 필요한 사항을
          규정함을 목적으로 합니다.
        </Text>

        <Text style={styles.h2}>제 2 조 (정의)</Text>
        <Text style={styles.p}>
          1. "서비스"란 회사가 토스 앱 내에서 제공하는 반려견 행동 기록, 분석, AI 코칭 등의 모든 서비스를 의미합니다.
          {'\n'}2. "이용자"란 본 약관에 따라 회사가 제공하는 서비스를 받는 회원을 말합니다.{'\n'}3. "회원"이란 토스
          로그인을 통해 서비스 이용계약을 체결한 이용자를 말합니다.{'\n'}4. "토스 로그인"이란 토스 계정을 통한 인증
          및 개인정보 제공 동의 절차를 말합니다.
        </Text>

        <Text style={styles.h2}>제 3 조 (약관의 게시와 개정)</Text>
        <Text style={styles.p}>
          1. 회사는 이 약관의 내용을 이용자가 쉽게 알 수 있도록 서비스 내 또는 연결 화면을 통해 게시합니다.{'\n'}2.
          회사는 필요한 경우 관련 법령을 위배하지 않는 범위에서 본 약관을 개정할 수 있습니다. 개정된 약관은 시행일
          7일 전부터 공지하며, 중대한 변경사항의 경우 30일 전에 공지합니다.
        </Text>

        <Text style={styles.h2}>제 4 조 (서비스의 제공 및 변경)</Text>
        <Text style={styles.p}>
          회사는 다음과 같은 서비스를 제공합니다:{'\n'}- 반려견 행동 기록 및 관리 (ABC 선행-행동-결과 모델){'\n'}-
          AI 기반 행동 분석 및 맞춤 코칭{'\n'}- 데이터 시각화 (차트, 히트맵, 레이더){'\n'}- 훈련 커리큘럼 및
          미션 가이드{'\n'}- B2B 운영 관리 도구 (훈련사/센터 전용){'\n'}- 기타 회사가 정하는 부가 서비스
        </Text>

        <Text style={styles.h2}>제 5 조 (유료 서비스 및 결제)</Text>
        <Text style={styles.p}>
          1. 회사는 다음과 같은 유료 서비스를 제공합니다:{'\n'}  - PRO 구독: 월 4,900원{'\n'}  - 토큰 10회:
          1,900원{'\n'}  - 토큰 30회: 4,900원{'\n'}  - B2B 플랜: 별도 가격{'\n'}2. 결제는 토스 인앱
          결제(IAP)를 통해 이루어지며, 환불은 토스 인앱 결제 정책에 따릅니다.{'\n'}3. 유료 서비스의 가격은 변경될
          수 있으며, 변경 시 사전에 공지합니다.
        </Text>

        <Text style={styles.h2}>제 6 조 (서비스의 중단)</Text>
        <Text style={styles.p}>
          1. 회사는 시스템 보수점검, 교체 및 고장, 통신두절 또는 운영상 상당한 이유가 있는 경우 서비스의 제공을
          일시적으로 중단할 수 있습니다.{'\n'}2. 서비스 중단 시 회사는 사전에 공지합니다.
        </Text>

        <Text style={styles.h2}>제 7 조 (회원가입 및 연결)</Text>
        <Text style={styles.p}>
          1. 서비스 이용을 위해서는 토스 로그인이 필수입니다.{'\n'}2. 회사는 토스 로그인을 통해 다음 정보를 제공받을
          수 있습니다: 사용자 키, 이름, 전화번호, 이메일{'\n'}3. 이름, 전화번호, 이메일은 AES-256-GCM 알고리즘으로
          암호화하여 저장합니다.
        </Text>

        <Text style={styles.h2}>제 8 조 (서비스 연결 해제 및 탈퇴)</Text>
        <Text style={styles.p}>
          1. 이용자는 토스 앱 설정에서 서비스 연결을 해제할 수 있습니다.{'\n'}2. 연결 해제(UNLINK): 30일간 데이터
          보관 후 삭제. 재연결 시 복구 가능.{'\n'}3. 이용약관 철회(WITHDRAWAL_TERMS): 개인정보 즉시 삭제 및 익명화
          처리.{'\n'}4. 토스 탈퇴(WITHDRAWAL_TOSS): 모든 데이터 즉시 삭제(CASCADE).{'\n'}5. 전자상거래법에 따라
          결제 이력은 5년간 보존됩니다.
        </Text>

        <Text style={styles.h2}>제 9 조 (AI 서비스 면책)</Text>
        <Text style={styles.p}>
          1. 본 서비스의 AI 코칭은 참고 정보이며, 전문 수의사 또는 동물행동전문가의 상담을 대체하지 않습니다.{'\n'}
          2. AI 코칭 결과에 따른 훈련 수행은 이용자의 자유의사에 기반하며, 그 결과에 대해 회사는 법적 책임을 지지
          않습니다.
        </Text>

        <Text style={styles.h2}>제 10 조 (준거법 및 분쟁해결)</Text>
        <Text style={styles.p}>
          1. 본 약관은 대한민국 법률에 따라 규율됩니다.{'\n'}2. 서비스 이용과 관련한 분쟁은 민사소송법에 따른
          관할법원에서 해결합니다.
        </Text>

        <View style={styles.spacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F4F6',
  },
  backButton: { width: 40 },
  backText: { fontSize: 20, color: '#191F28' },
  navTitle: { fontSize: 17, fontWeight: '600', color: '#191F28' },
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 48 },
  meta: { fontSize: 13, color: '#8B95A1', marginBottom: 24 },
  h2: { fontSize: 17, fontWeight: '600', color: '#191F28', marginTop: 24, marginBottom: 8 },
  p: { fontSize: 15, lineHeight: 24, color: '#333D4B' },
  spacer: { height: 40 },
});
