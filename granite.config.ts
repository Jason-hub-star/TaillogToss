/**
 * TaillogToss Granite 설정 — 파일 기반 라우팅 + Hermes 엔진
 * Parity: APP-001
 */
import { router } from '@granite-js/plugin-router';
import { hermes } from '@granite-js/plugin-hermes';
import { appsInToss } from '@apps-in-toss/framework/plugins';
import { defineConfig } from '@granite-js/react-native/config';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// __dirname이 .granite/ 서브디렉토리일 수 있으므로 프로젝트 루트까지 탐색
function findEnvFile(startDir: string): string | null {
  let dir = startDir;
  for (let i = 0; i < 4; i++) {
    const candidate = path.join(dir, '.env');
    if (fs.existsSync(candidate)) return candidate;
    dir = path.dirname(dir);
  }
  return null;
}

const envPath = findEnvFile(__dirname);
if (envPath) {
  dotenv.config({ path: envPath });
} else {
  console.warn('[granite.config] .env not found from', __dirname);
}

function getEnv(key: string): string {
  return process.env[key] ?? '';
}

const defineEnv: Record<string, string> = {
  'process.env.EXPO_PUBLIC_SUPABASE_URL': JSON.stringify(getEnv('EXPO_PUBLIC_SUPABASE_URL')),
  'process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY': JSON.stringify(getEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY')),
  'process.env.SUPABASE_URL': JSON.stringify(getEnv('SUPABASE_URL')),
  'process.env.SUPABASE_ANON_KEY': JSON.stringify(getEnv('SUPABASE_ANON_KEY')),
  'process.env.AIT_AD_R1': JSON.stringify(getEnv('AIT_AD_R1')),
  'process.env.AIT_AD_R2': JSON.stringify(getEnv('AIT_AD_R2')),
  'process.env.AIT_AD_R3': JSON.stringify(getEnv('AIT_AD_R3')),
  'process.env.AIT_AD_B1': JSON.stringify(getEnv('AIT_AD_B1')),
  'process.env.AIT_AD_B2': JSON.stringify(getEnv('AIT_AD_B2')),
  'process.env.AIT_AD_B3': JSON.stringify(getEnv('AIT_AD_B3')),
  'process.env.AIT_AD_I1': JSON.stringify(getEnv('AIT_AD_I1')),
};

export default defineConfig({
  appName: 'taillog-app',
  scheme: 'intoss',
  build: {
    esbuild: {
      define: defineEnv,
    },
  },
  plugins: [
    router(),
    hermes(),
    appsInToss({
      brand: {
        displayName: '테일로그',
        primaryColor: '#3182F6',
        icon: './src/assets/icons/app-logo-600.png',
      },
      permissions: [],
    }),
  ],
});
