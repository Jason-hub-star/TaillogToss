/**
 * TaillogToss Granite 설정 — 파일 기반 라우팅 + Hermes 엔진
 * Parity: APP-001
 */
import { router } from '@granite-js/plugin-router';
import { hermes } from '@granite-js/plugin-hermes';
import { appsInToss } from '@apps-in-toss/framework/plugins';
import { defineConfig } from '@granite-js/react-native/config';

export default defineConfig({
  appName: 'taillog-app',
  scheme: 'intoss',
  // 토스 콘솔 등록 시 brand 정보 — defineConfig 타입 미지원 시 콘솔 수동 입력
  // displayName: '테일로그'
  // primaryColor: '#0064FF'
  // icon: './assets/app-icon.png'
  plugins: [
    router(),
    hermes(),
    appsInToss({
      brand: {
        displayName: '테일로그',
        primaryColor: '#3182F6',
        icon: '',
      },
      permissions: [],
    }),
  ],
});
