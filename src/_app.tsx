/**
 * TaillogToss 앱 컨테이너 — AppsInToss.registerApp 엔트리
 * Parity: APP-001
 */
import React, { type PropsWithChildren, useEffect, useRef, useState } from 'react';
import { LogBox } from 'react-native';
import { AppsInToss } from '@apps-in-toss/framework';
import { type InitialProps } from '@granite-js/react-native';

// LogBox 오버레이 비활성화 — SafeArea 충돌 방지, 콘솔 워닝은 adb logcat으로 확인
LogBox.ignoreAllLogs(true);
import { context } from '../require.context';
import { QueryProvider } from 'stores/QueryProvider';
import { AuthProvider, useAuth } from 'stores/AuthContext';
import { ActiveDogProvider, useActiveDog } from 'stores/ActiveDogContext';
import { OrgProvider } from 'stores/OrgContext';
import { SurveyProvider } from 'stores/SurveyContext';
import { usePendingOrderRecovery } from 'lib/hooks/useSubscription';
import { useAppStateRefetch } from 'lib/hooks/useAppStateRefetch';
import { ErrorBoundary } from 'components/tds-ext/ErrorBoundary';
import { getMyOrg } from 'lib/api/org';
import { useOrg } from 'stores/OrgContext';
import { DevMenu } from 'components/shared/DevMenu';
import { isDevToolsEnabled } from 'lib/devTools';
import { POST_PAINT_BOOTSTRAP_DELAY_MS } from 'lib/api/queryConfig';
import {
  initStartupPerformance,
  markStartupPerformance,
  markStartupPerformanceOnce,
} from 'lib/performance/startupPerformance';

console.log('[AIT-BUILD] taillog-startup-perf-20260511-1545');

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

    markStartupPerformance('org_bootstrap_start', { userId: user.id });

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
        markStartupPerformance('org_bootstrap_done', { userId: user.id });
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

function DeferredBootstrap() {
  markStartupPerformanceOnce('deferred_bootstrap_mounted');

  return (
    <>
      <PendingOrderRecovery />
      <AppStateRefreshBridge />
      <OrgBootstrap />
    </>
  );
}

function usePostPaintBootstrapReady(): boolean {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let frameId: number | null = null;
    let cancelled = false;

    const afterPaint = () => {
      timeoutId = setTimeout(() => {
        if (cancelled) return;
        markStartupPerformanceOnce('first_paint_boundary');
        setIsReady(true);
      }, POST_PAINT_BOOTSTRAP_DELAY_MS);
    };

    if (typeof requestAnimationFrame === 'function') {
      frameId = requestAnimationFrame(afterPaint);
    } else {
      afterPaint();
    }

    return () => {
      cancelled = true;
      if (frameId !== null && typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(frameId);
      }
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

  return isReady;
}

function AppContainer(props: PropsWithChildren<InitialProps>) {
  const { children } = props;
  const perfInitializedRef = useRef(false);
  const postPaintBootstrapReady = usePostPaintBootstrapReady();

  if (!perfInitializedRef.current) {
    const startupProps = props as PropsWithChildren<InitialProps> & {
      loadingStartTs?: number;
      scheme?: string;
    };
    initStartupPerformance({
      loadingStartTs: startupProps.loadingStartTs,
      scheme: startupProps.scheme,
    });
    perfInitializedRef.current = true;
  }

  return (
    <ErrorBoundary>
      <QueryProvider>
        <AuthProvider>
          <ActiveDogProvider>
            <OrgProvider>
              <SurveyProvider>
                {children}
                {postPaintBootstrapReady && <DeferredBootstrap />}
                {isDevToolsEnabled() && <DevMenu />}
              </SurveyProvider>
            </OrgProvider>
          </ActiveDogProvider>
        </AuthProvider>
      </QueryProvider>
    </ErrorBoundary>
  );
}

export default AppsInToss.registerApp(AppContainer, {
  context,
});
