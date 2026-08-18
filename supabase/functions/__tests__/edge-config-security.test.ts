import { readFileSync } from 'fs';

function functionBlock(config: string, name: string): string {
  const startMarker = `[functions.${name}]`;
  const start = config.indexOf(startMarker);
  if (start < 0) throw new Error(`Missing ${startMarker}`);
  const next = config.indexOf('\n[functions.', start + startMarker.length);
  return config.slice(start, next < 0 ? undefined : next);
}

function verifyJwtFor(config: string, name: string): boolean {
  const block = functionBlock(config, name);
  const match = block.match(/verify_jwt\s*=\s*(true|false)/);
  if (!match) throw new Error(`Missing verify_jwt for ${name}`);
  return match[1] === 'true';
}

function edgeFunctionNames(config: string): string[] {
  return [...config.matchAll(/^\[functions\.([^\]]+)\]/gm)].map((match) => match[1]);
}

function entrypointFor(config: string, name: string): string {
  const block = functionBlock(config, name);
  const match = block.match(/entrypoint\s*=\s*"([^"]+)"/);
  if (!match) throw new Error(`Missing entrypoint for ${name}`);
  return match[1].replace(/^\.\//, 'supabase/');
}

function expectInternalJwtVerification(source: string, name: string): void {
  expect(source).toContain('/auth/v1/user');
  expect(source).toContain("req.headers.get('Authorization')");
  expect(source).toContain("authHeader?.startsWith('Bearer ')");
  expect(source).toContain('Authorization: `Bearer ${jwt}`');
  expect(source).toContain('apikey: serviceRoleKey');
  expect(source).not.toContain("req.headers.get('x-user-role')");
  expect(source).not.toContain('req.headers.get("x-user-role")');

  if (name === 'assign-b2b-role') {
    expect(source).not.toContain('body.userId');
    expect(source).toContain('const owner = await verifyJwtOwner');
    expect(source).toContain('/auth/v1/admin/users/${owner.userId}');
    expect(source).toContain('/rest/v1/users?id=eq.${owner.userId}');
  }

  if (name === 'withdraw-user') {
    expect(source).toContain('const verified = await verifyJwtOwner');
    expect(source).toContain('const userId = parsed?.userId');
    expect(source).toContain('verified.userId !== userId');
  }
}

describe('supabase edge function auth config', () => {
  const config = readFileSync('supabase/config.toml', 'utf8');

  test('role-protected edge functions keep gateway JWT verification enabled', () => {
    for (const name of ['grant-toss-points', 'send-smart-message', 'generate-report']) {
      expect(verifyJwtFor(config, name)).toBe(true);
    }
  });

  test('role-protected edge entrypoints build context from JWT instead of role headers', () => {
    for (const name of ['grant-toss-points', 'send-smart-message', 'generate-report']) {
      const source = readFileSync(entrypointFor(config, name), 'utf8');
      expect(source).toContain('buildEdgeContext(request)');
      expect(source).not.toContain("request.headers.get('x-user-role')");
      expect(source).not.toContain('request.headers.get("x-user-role")');
      expect(source).not.toContain("headers.get('x-user-role')");
      expect(source).not.toContain('headers.get("x-user-role")');
    }
  });

  test('verify-iap-order remains explicitly internal-auth guarded when gateway JWT is disabled', () => {
    expect(verifyJwtFor(config, 'verify-iap-order')).toBe(false);

    const source = readFileSync('supabase/functions/verify-iap-order/main.ts', 'utf8');
    expect(source).toContain('/auth/v1/user');
    expect(source).toContain('verifyJwtViaAuth');
    expect(source).toContain('resolveEffectiveRole');
    expect(source).toContain('isTrustedServiceRoleToken');
  });

  test('public verify_jwt=false functions document or implement their own auth boundary', () => {
    for (const name of ['assign-b2b-role', 'withdraw-user']) {
      expect(verifyJwtFor(config, name)).toBe(false);
      const source = readFileSync(`supabase/functions/${name}/index.ts`, 'utf8');
      expectInternalJwtVerification(source, name);
    }

    expect(verifyJwtFor(config, 'toss-disconnect')).toBe(false);
    const disconnectSource = readFileSync('supabase/functions/toss-disconnect/index.ts', 'utf8');
    const disconnectTests = readFileSync('supabase/functions/__tests__/toss-disconnect.test.ts', 'utf8');
    expect(disconnectSource).toContain('verifyBasicAuth(authHeader, deps)');
    expect(disconnectSource).toContain('TOSS_CALLBACK_AUTH_ID');
    expect(disconnectSource).toContain('TOSS_CALLBACK_AUTH_PW');
    expect(disconnectTests).toContain('rejects missing Basic Auth before any service-role request');
    expect(disconnectTests).toContain('rejects invalid Basic Auth before touching Supabase');
  });

  test('every verify_jwt=false function has a documented public or internal auth boundary', () => {
    const publicExceptions = new Set(['legal', 'login-with-toss', 'toss-disconnect']);
    const falseJwtFunctions = edgeFunctionNames(config).filter((name) => !verifyJwtFor(config, name));

    expect(falseJwtFunctions.sort()).toEqual([
      'assign-b2b-role',
      'legal',
      'login-with-toss',
      'toss-disconnect',
      'verify-iap-order',
      'withdraw-user',
    ]);

    for (const name of falseJwtFunctions) {
      const source = readFileSync(entrypointFor(config, name), 'utf8');
      if (!publicExceptions.has(name)) {
        if (name === 'verify-iap-order') {
          expect(source).toContain('/auth/v1/user');
          expect(source).toContain('const token = readBearerToken(request)');
          expect(source).toContain('verifyJwtViaAuth(token)');
          expect(source).toContain('Authorization: `Bearer ${token}`');
          expect(source).toContain('isTrustedServiceRoleToken(token, SUPABASE_SERVICE_ROLE_KEY)');
          expect(source).toContain("bodyUserId: body.userId");
          expect(source).toContain('authUserId: resolvedUserId');
          expect(source).not.toContain("request.headers.get('x-user-role')");
          expect(source).not.toContain('request.headers.get("x-user-role")');
        } else {
          expectInternalJwtVerification(source, name);
        }
      }
    }

    const loginSource = readFileSync('supabase/functions/login-with-toss/index.ts', 'utf8');
    expect(loginSource).toContain('createMTLSClient(resolveMtlsMode())');
    expect(loginSource).toContain('exchangeAuthorizationCode');
    expect(loginSource).toContain('await rememberConsumedAuthCode');
    expect(loginSource).not.toContain("createMTLSClient('mock')");

    const disconnectSource = readFileSync('supabase/functions/toss-disconnect/index.ts', 'utf8');
    expect(disconnectSource).toContain('verifyBasicAuth(authHeader, deps)');
    expect(disconnectSource).toContain('TOSS_CALLBACK_AUTH_ID');
    expect(disconnectSource).toContain('TOSS_CALLBACK_AUTH_PW');

    const legalSource = readFileSync('supabase/functions/legal/index.ts', 'utf8');
    expect(legalSource).toContain('토스 콘솔에 등록할 약관/동의문 URL 제공');
  });
});
