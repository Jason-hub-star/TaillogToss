/**
 * mTLS 모드 자동 감지 — 4종 Edge Function 공통
 * cert+key 환경변수가 있으면 real, 없으면 mock (로컬 개발 안전)
 */

export function readEnv(name: string): string | undefined {
  const fromNode = (globalThis as { process?: { env?: Record<string, string | undefined> } })
    .process?.env?.[name];
  if (fromNode) return fromNode;
  const fromDeno = (globalThis as { Deno?: { env?: { get: (key: string) => string | undefined } } })
    .Deno?.env?.get(name);
  return fromDeno;
}

export function resolveMtlsMode(): 'real' | 'mock' {
  const explicit = readEnv('TOSS_MTLS_MODE')?.trim().toLowerCase();
  if (explicit === 'real') return 'real';
  if (explicit === 'mock') return 'mock';
  const cert = readEnv('TOSS_CLIENT_CERT_BASE64');
  const key = readEnv('TOSS_CLIENT_KEY_BASE64');
  return cert && key ? 'real' : 'mock';
}
