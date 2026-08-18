/**
 * mTLS 모드 자동 감지 — 4종 Edge Function 공통
 * 운영 환경에서는 cert/key가 없거나 mock이 명시돼도 real로 판정해 S2S 호출이 fail-closed 되게 한다.
 */

export function readEnv(name: string): string | undefined {
  const fromNode = (globalThis as { process?: { env?: Record<string, string | undefined> } })
    .process?.env?.[name];
  if (fromNode) return fromNode;
  const fromDeno = (globalThis as { Deno?: { env?: { get: (key: string) => string | undefined } } })
    .Deno?.env?.get(name);
  return fromDeno;
}

type EnvReader = (name: string) => string | undefined;

function isProductionLike(read: EnvReader): boolean {
  const candidates = [
    read('APP_ENV'),
    read('NODE_ENV'),
    read('DENO_ENV'),
    read('ENVIRONMENT'),
    read('TOSS_RUNTIME_MODE'),
  ]
    .map((value) => value?.trim().toLowerCase())
    .filter(Boolean);

  return candidates.some((value) =>
    value === 'production' ||
    value === 'prod' ||
    value === 'sandbox_real' ||
    value === 'prod_read' ||
    value === 'prod_ready'
  );
}

function isExplicitDevLocal(read: EnvReader): boolean {
  const candidates = [
    read('APP_ENV'),
    read('NODE_ENV'),
    read('DENO_ENV'),
    read('ENVIRONMENT'),
    read('TOSS_RUNTIME_MODE'),
  ]
    .map((value) => value?.trim().toLowerCase())
    .filter(Boolean);

  return candidates.some((value) =>
    value === 'development' ||
    value === 'dev' ||
    value === 'test' ||
    value === 'local' ||
    value === 'dev_local'
  );
}

export function resolveMtlsModeWithEnv(read: EnvReader): 'real' | 'mock' {
  if (isProductionLike(read)) return 'real';

  const explicit = read('TOSS_MTLS_MODE')?.trim().toLowerCase();
  if (explicit === 'real') return 'real';
  if (explicit === 'mock' && isExplicitDevLocal(read)) return 'mock';
  if (!explicit && isExplicitDevLocal(read)) return 'mock';
  return 'real';
}

export function resolveMtlsMode(): 'real' | 'mock' {
  return resolveMtlsModeWithEnv(readEnv);
}
