/**
 * 개인정보 수집·이용 동의 페이지 — 로그인/설정에서 접근.
 * Edge Function legal?doc=privacy 와 동일 내용을 네이티브로 렌더링.
 */
import { createRoute, useNavigation } from '@granite-js/react-native';
import React from 'react';
import { View, Text, ScrollView, StyleSheet ,TouchableOpacity  } from 'react-native';
import { SafeAreaView } from '@granite-js/native/react-native-safe-area-context';
import { colors, typography } from 'styles/tokens';

export const Route = createRoute('/legal/privacy', {
  component: LegalPrivacyPage,
  screenOptions: { headerShown: false },
});

function LegalPrivacyPage() {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.navbar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>{'←'}</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>개인정보 수집·이용 동의</Text>
        <View style={styles.backButton} />
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={styles.meta}>최종 수정일: 2026년 2월 27일 | 시행일: 2026년 2월 27일</Text>

        <Text style={styles.p}>
          테일로그(TailLog, 이하 "회사")는 개인정보 보호법에 따라 이용자의 개인정보를 보호하고, 이와 관련한 고충을
          신속하게 처리할 수 있도록 다음과 같은 개인정보 수집·이용 동의를 안내합니다.
        </Text>

        <Text style={styles.h2}>1. 수집하는 개인정보 항목</Text>
        <Text style={styles.h3}>필수 수집 항목</Text>
        <Text style={styles.p}>
          - Toss 사용자 키 (userKey){'\n'}- 이름 (AES-256-GCM 암호화 저장){'\n'}- 전화번호 (AES-256-GCM 암호화
          저장){'\n'}- 이메일 (AES-256-GCM 암호화 저장)
        </Text>

        <Text style={styles.h3}>선택 수집 항목</Text>
        <Text style={styles.p}>
          - 반려견 정보 (이름, 품종, 나이, 체중, 중성화 여부){'\n'}- CI (본인확인정보){'\n'}- 생년월일
        </Text>

        <Text style={styles.h3}>자동 수집 항목</Text>
        <Text style={styles.p}>
          - 행동 기록 데이터 (ABC 기록, 강도, 시간, 장소){'\n'}- AI 코칭 생성 결과{'\n'}- 결제 이력 (상품명, 금액,
          결제일시){'\n'}- 접속 로그, 기기 정보, 앱 버전
        </Text>

        <Text style={styles.h2}>2. 개인정보 수집 및 이용 목적</Text>
        <Text style={styles.p}>
          - 서비스 제공: 반려견 행동 기록, AI 코칭, 훈련 커리큘럼{'\n'}- 본인 확인: 토스 로그인 인증{'\n'}- 서비스
          개선: 이용 통계, AI 모델 개선{'\n'}- 결제 처리: 토스 인앱 결제(IAP){'\n'}- 고객 지원: 문의 응대, 분쟁
          해결{'\n'}- 마케팅: 이벤트, 프로모션 안내 (동의 시)
        </Text>

        <Text style={styles.h2}>3. 개인정보 보유 및 이용 기간</Text>
        <Text style={styles.p}>
          - 서비스 이용 기간: 서비스 이용 중 보관{'\n'}- 연결 해제(UNLINK): 30일 유예 후 삭제{'\n'}- 이용약관
          철회(WITHDRAWAL_TERMS): 즉시 삭제 및 익명화{'\n'}- 토스 탈퇴(WITHDRAWAL_TOSS): 즉시 전체 삭제
          (CASCADE){'\n'}- 결제 이력: 전자상거래법에 따라 5년 보존{'\n'}- 접속 로그: 통신비밀보호법에 따라 3개월
          보존
        </Text>

        <Text style={styles.h2}>4. 개인정보 암호화 및 보안 조치</Text>
        <Text style={styles.p}>
          - 민감 개인정보(이름, 전화번호, 이메일): AES-256-GCM 알고리즘으로 암호화 저장{'\n'}- 비밀번호: PBKDF2
          해시 처리{'\n'}- Toss S2S 통신: mTLS(상호 인증서 인증) 적용{'\n'}- 데이터 전송: HTTPS(TLS 1.3) 암호화
        </Text>

        <Text style={styles.h2}>5. 개인정보 제3자 제공</Text>
        <Text style={styles.p}>
          회사는 이용자의 개인정보를 제3자에게 제공하지 않습니다. 다만, Toss S2S(서버 간 mTLS 통신)를 통해 토스
          서비스와 필요한 정보를 교환합니다.
        </Text>

        <Text style={styles.h2}>6. 개인정보 처리 위탁</Text>
        <Text style={styles.p}>
          - 클라우드 호스팅 및 서버 인증/결제 처리: Supabase (미국, AWS, Edge Function 포함){'\n'}- AI 코칭 생성: OpenAI API (데이터 학습 미사용 설정)
        </Text>

        <Text style={styles.h2}>7. 이용자의 권리</Text>
        <Text style={styles.p}>
          이용자는 언제든지 개인정보의 조회, 수정, 삭제를 요청할 수 있으며, 토스 앱 설정에서 서비스 연결을 해제하여
          개인정보 삭제를 요청할 수 있습니다.
        </Text>

        <Text style={styles.h2}>8. 개인정보 보호책임자</Text>
        <Text style={styles.p}>
          - 담당자: 테일로그 개인정보 보호팀{'\n'}- 이메일: gmdqn2tp@gmail.com
        </Text>

        <View style={styles.spacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceTertiary,
  },
  backButton: { width: 40 },
  backText: { ...typography.sectionTitle, color: colors.grey950 },
  navTitle: { ...typography.body, fontWeight: '600', color: colors.grey950 },
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 48 },
  meta: { ...typography.caption, color: colors.textSecondary, marginBottom: 24 },
  h2: { ...typography.body, fontWeight: '600', color: colors.grey950, marginTop: 24, marginBottom: 8 },
  h3: { ...typography.bodySmall, fontWeight: '600', color: colors.textDark, marginTop: 16, marginBottom: 6 },
  p: { ...typography.bodySmall, lineHeight: 24, color: colors.textDark },
  spacer: { height: 40 },
});
