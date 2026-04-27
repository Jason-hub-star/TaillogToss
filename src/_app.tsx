/**
 * TaillogToss 앱 컨테이너 — Granite.registerApp 엔트리
 * Parity: APP-001
 */
import React, { type PropsWithChildren, useEffect } from 'react';
import { LogBox } from 'react-native';
import { Granite, getSchemeUri, type InitialProps } from '@granite-js/react-native';

// LogBox 오버레이 비활성화 — SafeArea 충돌 방지, 콘솔 워닝은 adb logcat으로 확인
LogBox.ignoreAllLogs(true);
import { context } from '../require.context';
import { QueryProvider } from 'stores/QueryProvider';
import { AuthProvider, useAuth } from 'stores/AuthContext';
import { ActiveDogProvider, useActiveDog } from 'stores/ActiveDogContext';
import { OrgProvider } from 'stores/OrgContext';
import { SurveyProvider } from 'stores/SurveyContext';
import { rewriteInitialUrlForDeepEntry } from 'lib/guards';
import { usePendingOrderRecovery } from 'lib/hooks/useSubscription';
import { useAppStateRefetch } from 'lib/hooks/useAppStateRefetch';
import { ErrorBoundary } from 'components/tds-ext/ErrorBoundary';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { getMyOrg } from 'lib/api/org';
import { useOrg } from 'stores/OrgContext';
import { DevMenu } from 'components/shared/DevMenu';


/**
 * OrgBootstrap — B2B 역할 유저가 앱 시작 시 자신의 org를 DB에서 로드
 * OrgContext의 초기값이 null이므로 세션 복원 후 한 번 실행이 필요하다.
 * org가 이미 설정되어 있으면 skip (ops/setup.tsx로 신규 생성한 경우 포함).
 */
function OrgBootstrap() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { org, setOrg, setMembership, setOrgLoading } = useOrg();

  useEffect(() => {
    // 인증 로딩 중이면 대기
    if (isAuthLoading) return;

    // 비인증이거나 org가 이미 있으면 로딩 완료
    if (!user?.id || org) {
      setOrgLoading(false);
      return;
    }

    // role 체크 없이 시도 — B2C 유저는 org_members 레코드가 없으므로 null 반환
    getMyOrg(user.id)
      .then((result) => {
        if (result) {
          setOrg(result.org);
          setMembership(result.membership);
        }
      })
      .catch((err) => {
        if (__DEV__) console.warn('[OrgBootstrap] org 로드 실패:', err);
      })
      .finally(() => {
        setOrgLoading(false);
      });
  }, [user?.id, isAuthLoading, org, setOrg, setMembership, setOrgLoading]);

  return null;
}

/** 미완료 IAP 주문 복구 — 앱 마운트 시 자동 실행 */
function PendingOrderRecovery() {
  const { user } = useAuth();
  usePendingOrderRecovery(user?.id);
  return null;
}

/** 백그라운드 복귀 시 핵심 쿼리 자동 갱신 */
function AppStateRefreshBridge() {
  const { activeDog } = useActiveDog();
  useAppStateRefetch(activeDog?.id);
  return null;
}

function AppContainer({ children }: PropsWithChildren<InitialProps>) {
  return (
    <SafeAreaProvider>
    <ErrorBoundary>
      <QueryProvider>
        <AuthProvider>
          <PendingOrderRecovery />
          <ActiveDogProvider>
            <AppStateRefreshBridge />
            <OrgProvider>
              <OrgBootstrap />
              <SurveyProvider>
                {children}
                {__DEV__ && <DevMenu />}
              </SurveyProvider>
            </OrgProvider>
          </ActiveDogProvider>
        </AuthProvider>
      </QueryProvider>
    </ErrorBoundary>
    </SafeAreaProvider>
  );
}

export default Granite.registerApp(AppContainer, {
  appName: 'taillog-app',
  context,
  getInitialUrl: async (initialScheme: string) => {
    const initialUrl = getSchemeUri();
    return rewriteInitialUrlForDeepEntry(initialUrl, initialScheme);
  },
});
