import { resolveMtlsModeWithEnv } from '../mtlsMode.ts';

function env(values: Record<string, string | undefined>) {
  return (name: string) => values[name];
}

describe('mtlsMode', () => {
  test('uses mock only for non-production development when explicitly requested', () => {
    expect(resolveMtlsModeWithEnv(env({
      TOSS_RUNTIME_MODE: 'DEV_LOCAL',
      TOSS_MTLS_MODE: 'mock',
    }))).toBe('mock');
  });

  test('fails closed to real when mock is configured without explicit dev-local mode', () => {
    expect(resolveMtlsModeWithEnv(env({ TOSS_MTLS_MODE: 'mock' }))).toBe('real');
  });

  test('uses mock by default only in explicit dev-local mode', () => {
    expect(resolveMtlsModeWithEnv(env({ NODE_ENV: 'test' }))).toBe('mock');
  });

  test('uses real mode when cert and key are present', () => {
    expect(resolveMtlsModeWithEnv(env({
      TOSS_CLIENT_CERT_BASE64: 'cert',
      TOSS_CLIENT_KEY_BASE64: 'key',
    }))).toBe('real');
  });

  test('production fails closed to real mode even if mock is configured', () => {
    expect(resolveMtlsModeWithEnv(env({
      APP_ENV: 'production',
      TOSS_MTLS_MODE: 'mock',
    }))).toBe('real');
  });

  test('prod-ready mode fails closed to real mode without certs', () => {
    expect(resolveMtlsModeWithEnv(env({ TOSS_RUNTIME_MODE: 'PROD_READY' }))).toBe('real');
  });

  test.each(['SANDBOX_REAL', 'PROD_READ'])(
    'runtime mode %s ignores explicit mock and fails closed to real',
    (runtimeMode) => {
      expect(resolveMtlsModeWithEnv(env({
        TOSS_RUNTIME_MODE: runtimeMode,
        TOSS_MTLS_MODE: 'mock',
      }))).toBe('real');
    },
  );

  test.each(['SANDBOX_REAL', 'PROD_READ', 'PROD_READY'])(
    'runtime mode %s wins over NODE_ENV=test and fails closed to real',
    (runtimeMode) => {
      expect(resolveMtlsModeWithEnv(env({
        NODE_ENV: 'test',
        TOSS_RUNTIME_MODE: runtimeMode,
        TOSS_MTLS_MODE: 'mock',
      }))).toBe('real');
    },
  );

  test('missing mode and missing certs still fail closed to real', () => {
    expect(resolveMtlsModeWithEnv(env({}))).toBe('real');
  });
});
