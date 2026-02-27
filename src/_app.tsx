/**
 * TaillogToss 앱 컨테이너 — Granite.registerApp 엔트리
 * Parity: APP-001
 */
import React, { type PropsWithChildren } from 'react';
import { getSchemeUri, type InitialProps } from '@granite-js/react-native';
import { AppsInToss } from '@apps-in-toss/framework';
import { context } from '../require.context';
import { QueryProvider } from 'stores/QueryProvider';
import { AuthProvider, useAuth } from 'stores/AuthContext';
import { ActiveDogProvider } from 'stores/ActiveDogContext';
import { OrgProvider } from 'stores/OrgContext';
import { SurveyProvider } from 'stores/SurveyContext';
import { rewriteInitialUrlForDeepEntry } from 'lib/guards';
import { usePendingOrderRecovery } from 'lib/hooks/useSubscription';

/** 미완료 IAP 주문 복구 — 앱 마운트 시 자동 실행 */
function PendingOrderRecovery() {
  const { user } = useAuth();
  usePendingOrderRecovery(user?.id);
  return null;
}

function AppContainer({ children }: PropsWithChildren<InitialProps>) {
  return (
    <QueryProvider>
      <AuthProvider>
        <PendingOrderRecovery />
        <ActiveDogProvider>
          <OrgProvider>
            <SurveyProvider>{children}</SurveyProvider>
          </OrgProvider>
        </ActiveDogProvider>
      </AuthProvider>
    </QueryProvider>
  );
}

export default AppsInToss.registerApp(AppContainer, {
  appName: 'taillog-app',
  context,
  getInitialUrl: async (initialScheme) => {
    const initialUrl = getSchemeUri();
    return rewriteInitialUrlForDeepEntry(initialUrl, initialScheme);
  },
});
