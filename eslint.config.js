/**
 * TaillogToss ESLint 설정 — Granite 템플릿 기반 + TypeScript strict
 */
import pluginJs from '@eslint/js';
import tseslint from 'typescript-eslint';
import pluginReact from 'eslint-plugin-react';
import globals from 'globals';

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '*.{cjs,js}',
      'src/router.gen.ts',
      // granite 빌드 생성물 — gitignore 대상이고 재생성되므로 린트하지 않는다
      '**/.granite/**',
    ],
  },
  { files: ['pages/**/*.{ts,jsx,tsx}', 'src/**/*.{ts,jsx,tsx}'] },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  {
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
  pluginReact.configs.flat.recommended,
  // `_` 접두 = 의도적 미사용(구조분해 잔여·시그니처 유지). 코드가 이미 이 관례를 쓴다.
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
    },
  },
  // NOTE: jsx-runtime 프리셋은 켜지 않는다 — 이 코드베이스는 React를 명시 import 하므로
  // 켜면 그 import 140여 건이 no-unused-vars 로 뒤집힌다(실측 2026-08-18).
  // react-in-jsx-scope 만 개별로 끈다.
  {
    rules: {
      'react/react-in-jsx-scope': 'off',
      // React Native 전용: <Text>는 HTML 엔티티를 렌더하지 않는다.
      // &quot; 를 넣으면 약관·개인정보 화면에 글자 그대로 찍힌다(실측 2026-08-18).
      'react/no-unescaped-entities': 'off',
      // React Native 정당 패턴: Metro 애셋 require(정적 해석 필요) +
      // __DEV__ 조건부 lazy require(프로덕션 번들에서 제거되어야 함). import로 대체 불가.
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  // Node에서 도는 빌드·검사 스크립트: CommonJS + node 전역
  {
    files: ['scripts/**/*.js', '*.config.js', 'jest.*.js'],
    languageOptions: {
      globals: { ...globals.node },
      sourceType: 'commonjs',
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  // 테스트: jest 전역
  {
    files: ['**/__tests__/**', '**/*.test.{ts,tsx,js}', '**/*.spec.{ts,tsx,js}'],
    languageOptions: { globals: { ...globals.jest, ...globals.node } },
  },
  // Deno Edge 함수
  {
    files: ['supabase/functions/**/*.ts'],
    languageOptions: { globals: { Deno: 'readonly', ...globals.node } },
  },
];
