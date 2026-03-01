/**
 * TaillogToss 앱 컨테이너 — Granite.registerApp 엔트리
 * Parity: APP-001
 */
import React, { type PropsWithChildren } from 'react';
import { Granite, getSchemeUri, type InitialProps } from '@granite-js/react-native';
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
import { DevMenu } from 'components/shared/DevMenu';

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
    <ErrorBoundary>
      <QueryProvider>
        <AuthProvider>
          <PendingOrderRecovery />
          <ActiveDogProvider>
            <AppStateRefreshBridge />
            <OrgProvider>
              <SurveyProvider>
                {children}
                {__DEV__ && <DevMenu />}
              </SurveyProvider>
            </OrgProvider>
          </ActiveDogProvider>
        </AuthProvider>
      </QueryProvider>
    </ErrorBoundary>
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
