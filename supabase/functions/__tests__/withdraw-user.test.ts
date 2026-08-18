import { handleWithdraw, extractSubFromJwt, type WithdrawDeps } from '../withdraw-user/index.ts';

// 유효한 JWT 형식 생성 (서명 검증 없이 sub만 추출)
function makeJwt(sub: string): string {
  const header = btoa(JSON.stringify({ alg: 'ES256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({ sub, exp: 9999999999 }));
  return `Bearer ${header}.${payload}.fakesig`;
}

/**
 * verifyJwtOwner는 Admin API fetch를 내부에서 호출하므로,
 * fetchFn mock이 첫 번째 호출에서 user 정보를 반환하도록 설정한다.
 */
function makeDeps(userId: string, overrides?: Partial<WithdrawDeps>): WithdrawDeps {
  const mockFetch = jest.fn().mockResolvedValue(new Response(null, { status: 200 }));
  // 첫 호출: verifyJwtOwner — GET /auth/v1/user → { id: userId }
  mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({ id: userId }), { status: 200 }));

  return {
    getEnv: (key) => ({ SUPABASE_URL: 'https://test.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'srk_test' }[key]),
    fetchFn: mockFetch,
    ...overrides,
  };
}

describe('extractSubFromJwt', () => {
  it('유효한 Bearer JWT에서 sub 추출', () => {
    const jwt = makeJwt('user-abc');
    expect(extractSubFromJwt(jwt)).toBe('user-abc');
  });

  it('null 입력 → null', () => {
    expect(extractSubFromJwt(null)).toBeNull();
  });

  it('Bearer 없으면 → null', () => {
    expect(extractSubFromJwt('token.only')).toBeNull();
  });

  it('잘못된 JWT 파트 수 → null', () => {
    expect(extractSubFromJwt('Bearer onlyone')).toBeNull();
  });
});

describe('handleWithdraw', () => {
  it('환경변수 누락 → CONFIG_MISSING 500', async () => {
    const deps: WithdrawDeps = {
      getEnv: () => undefined,
      fetchFn: jest.fn(),
    };
    const result = await handleWithdraw(makeJwt('u1'), { userId: 'u1' }, deps);
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe('CONFIG_MISSING');
    expect(result.status).toBe(500);
  });

  it('JWT 없음 → UNAUTHORIZED 401', async () => {
    const deps: WithdrawDeps = {
      getEnv: (key) => ({ SUPABASE_URL: 'https://test.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'srk' }[key]),
      fetchFn: jest.fn().mockResolvedValue(new Response('{}', { status: 401 })),
    };
    const result = await handleWithdraw(null, { userId: 'u1' }, deps);
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe('UNAUTHORIZED');
    expect(result.status).toBe(401);
  });

  it('Admin API 검증 실패 → UNAUTHORIZED 401', async () => {
    const deps: WithdrawDeps = {
      getEnv: (key) => ({ SUPABASE_URL: 'https://test.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'srk' }[key]),
      fetchFn: jest.fn().mockResolvedValue(new Response('{}', { status: 401 })),
    };
    const result = await handleWithdraw(makeJwt('u1'), { userId: 'u1' }, deps);
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe('UNAUTHORIZED');
  });

  it('userId 누락 → INVALID_PARAMS 400', async () => {
    const deps = makeDeps('u1');
    const result = await handleWithdraw(makeJwt('u1'), {}, deps);
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe('INVALID_PARAMS');
    expect(result.status).toBe(400);
  });

  it('JWT sub !== body.userId → FORBIDDEN 403', async () => {
    const deps = makeDeps('user-A');
    const result = await handleWithdraw(makeJwt('user-A'), { userId: 'user-B' }, deps);
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe('FORBIDDEN');
    expect(result.status).toBe(403);
  });

  it('DB 삭제 실패 → DB_DELETE_FAILED 500', async () => {
    const mockFetch = jest.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/auth/v1/user')) return new Response(JSON.stringify({ id: 'u1' }), { status: 200 });
      if (url.includes('/rest/v1/users?id=eq.u1')) return new Response('error', { status: 500 });
      return new Response(null, { status: 200 });
    });
    const deps: WithdrawDeps = {
      getEnv: (key) => ({ SUPABASE_URL: 'https://test.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'srk' }[key]),
      fetchFn: mockFetch,
    };
    const result = await handleWithdraw(makeJwt('u1'), { userId: 'u1' }, deps);
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe('DB_DELETE_FAILED');
  });

  it('auth 삭제 실패 → AUTH_DELETE_FAILED 500', async () => {
    const mockFetch = jest.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/auth/v1/user')) return new Response(JSON.stringify({ id: 'u1' }), { status: 200 });
      if (url.includes('/auth/v1/admin/users/u1')) return new Response('auth error', { status: 422 });
      return new Response(null, { status: 200 });
    });
    const deps: WithdrawDeps = {
      getEnv: (key) => ({ SUPABASE_URL: 'https://test.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'srk' }[key]),
      fetchFn: mockFetch,
    };
    const result = await handleWithdraw(makeJwt('u1'), { userId: 'u1' }, deps);
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe('AUTH_DELETE_FAILED');
  });

  it('정상 탈퇴 → withdrawn: true 200', async () => {
    const deps = makeDeps('u1');
    const result = await handleWithdraw(makeJwt('u1'), { userId: 'u1' }, deps);
    expect(result.ok).toBe(true);
    expect(result.data?.withdrawn).toBe(true);
    expect(result.status).toBe(200);
    expect((deps.fetchFn as jest.Mock)).toHaveBeenCalledWith(
      expect.stringContaining('/rest/v1/users?id=eq.u1'),
      expect.objectContaining({ method: 'DELETE' }),
    );
    expect((deps.fetchFn as jest.Mock)).toHaveBeenCalledWith(
      expect.stringContaining('/auth/v1/admin/users/u1'),
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('404도 성공으로 처리 (이미 삭제된 경우)', async () => {
    const mockFetch = jest.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/auth/v1/user')) return new Response(JSON.stringify({ id: 'u1' }), { status: 200 });
      if (url.includes('/rest/v1/users?id=eq.u1')) return new Response(null, { status: 404 });
      if (url.includes('/auth/v1/admin/users/u1')) return new Response(null, { status: 404 });
      return new Response(null, { status: 200 });
    });
    const deps: WithdrawDeps = {
      getEnv: (key) => ({ SUPABASE_URL: 'https://test.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'srk' }[key]),
      fetchFn: mockFetch,
    };
    const result = await handleWithdraw(makeJwt('u1'), { userId: 'u1' }, deps);
    expect(result.ok).toBe(true);
  });

  it('verifyJwtOwner 및 DELETE URL 패턴 확인', async () => {
    const deps = makeDeps('test-uuid');
    await handleWithdraw(makeJwt('test-uuid'), { userId: 'test-uuid' }, deps);

    const calls = (deps.fetchFn as jest.Mock).mock.calls;
    // 1st: verifyJwtOwner
    expect(calls[0][0]).toContain('/auth/v1/user');
    expect(calls.some(([url]) => String(url).includes('/rest/v1/users?id=eq.test-uuid'))).toBe(true);
    expect(calls.some(([url]) => String(url).includes('/auth/v1/admin/users/test-uuid'))).toBe(true);
  });

  it('참조 데이터 정리 실패 → REFERENCE_CLEANUP_FAILED 500', async () => {
    const mockFetch = jest.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/auth/v1/user')) return new Response(JSON.stringify({ id: 'u1' }), { status: 200 });
      if (url.includes('/rest/v1/behavior_logs?recorded_by=eq.u1')) {
        return new Response('fk cleanup error', { status: 500 });
      }
      return new Response(null, { status: 200 });
    });
    const deps: WithdrawDeps = {
      getEnv: (key) => ({ SUPABASE_URL: 'https://test.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'srk' }[key]),
      fetchFn: mockFetch,
    };
    const result = await handleWithdraw(makeJwt('u1'), { userId: 'u1' }, deps);
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe('REFERENCE_CLEANUP_FAILED');
  });

  it('B2B org_dogs 삭제를 막는 pii_access_log.org_dog_id 참조를 먼저 해제', async () => {
    const mockFetch = jest.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/auth/v1/user')) return new Response(JSON.stringify({ id: 'u1' }), { status: 200 });
      if (url.includes('/rest/v1/dogs?user_id=eq.u1')) {
        return new Response(JSON.stringify([{ id: 'dog-1' }]), { status: 200 });
      }
      if (url.includes('/rest/v1/org_dogs?parent_user_id=eq.u1')) {
        return new Response(JSON.stringify([{ id: 'org-dog-parent' }]), { status: 200 });
      }
      if (url.includes('/rest/v1/org_dogs?dog_id=in.(dog-1)')) {
        return new Response(JSON.stringify([{ id: 'org-dog-owned' }]), { status: 200 });
      }
      return new Response(null, { status: 200 });
    });
    const deps: WithdrawDeps = {
      getEnv: (key) => ({ SUPABASE_URL: 'https://test.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'srk' }[key]),
      fetchFn: mockFetch,
    };

    const result = await handleWithdraw(makeJwt('u1'), { userId: 'u1' }, deps);

    expect(result.ok).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/rest/v1/pii_access_log?org_dog_id=in.(org-dog-parent,org-dog-owned)'),
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ org_dog_id: null }),
      }),
    );
  });
});
