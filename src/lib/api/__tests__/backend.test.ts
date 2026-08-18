/**
 * backend.test.ts — FastAPI client auth token hardening
 * Parity: AUTH-001
 */

const mockGetSession = jest.fn();
const mockGetUser = jest.fn();
const mockSignOut = jest.fn();

jest.mock('react-native', () => ({
  NativeModules: {
    SourceCode: {
      scriptURL: 'http://localhost:8081/index.bundle',
    },
  },
}));

jest.mock('../supabase', () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
      getUser: (...args: unknown[]) => mockGetUser(...args),
      signOut: (...args: unknown[]) => mockSignOut(...args),
    },
  },
}));

import { requestBackend, requestBackendPublic, withBackendFallback } from '../backend';

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get: jest.fn(() => null),
    },
    text: jest.fn(async () => JSON.stringify(body)),
  } as unknown as Response;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
  mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
  mockSignOut.mockResolvedValue({ error: null });
  global.fetch = jest.fn(async () => jsonResponse({ ok: true })) as jest.Mock;
});

describe('requestBackend auth guard', () => {
  it('세션이 없으면 protected backend 요청을 보내지 않는다', async () => {
    await expect(requestBackend('/api/v1/dogs/')).rejects.toMatchObject({
      message: 'BACKEND_AUTH_MISSING',
      status: 401,
    });

    expect(mockGetUser).not.toHaveBeenCalled();
    expect(mockSignOut).not.toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('저장 access token이 JWT 형식이 아니면 로그아웃 후 요청하지 않는다', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'sb_access_mock' } },
      error: null,
    });

    await expect(requestBackend('/api/v1/dogs/')).rejects.toMatchObject({
      message: 'BACKEND_AUTH_INVALID',
      status: 401,
    });

    expect(mockGetUser).not.toHaveBeenCalled();
    expect(mockSignOut).toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('JWT가 Supabase getUser 검증에 실패하면 로그아웃 후 요청하지 않는다', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'header.payload.signature' } },
      error: null,
    });
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: new Error('Invalid JWT') });

    await expect(requestBackend('/api/v1/dogs/')).rejects.toMatchObject({
      message: 'BACKEND_AUTH_INVALID',
      status: 401,
    });

    expect(mockGetUser).toHaveBeenCalledWith('header.payload.signature');
    expect(mockSignOut).toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('검증된 JWT만 Authorization 헤더에 붙인다', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'header.payload.signature' } },
      error: null,
    });

    await expect(requestBackend('/api/v1/dogs/')).resolves.toEqual({ ok: true });

    expect(mockGetUser).toHaveBeenCalledWith('header.payload.signature');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/dogs/'),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer header.payload.signature',
        }),
      }),
    );
  });

  it('caller-provided auth/role 헤더가 검증된 JWT를 덮어쓰지 못한다', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'header.payload.signature' } },
      error: null,
    });

    await expect(requestBackend('/api/v1/dogs/', {
      headers: {
        Authorization: 'Bearer forged.jwt.signature',
        apikey: 'forged-anon-key',
        'x-user-role': 'trainer',
        'x-user-id': 'attacker-user',
        'x-org-role': 'owner',
        'X-Timezone': 'Asia/Seoul',
      },
    })).resolves.toEqual({ ok: true });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/dogs/'),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer header.payload.signature',
          'X-Timezone': 'Asia/Seoul',
        }),
      }),
    );
    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.not.objectContaining({
          apikey: expect.any(String),
          'x-user-role': expect.any(String),
          'x-user-id': expect.any(String),
          'x-org-role': expect.any(String),
        }),
      }),
    );
  });

  it('public 요청은 깨진 저장 토큰을 버리고 Authorization 없이 계속 진행한다', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'sb_access_mock' } },
      error: null,
    });

    await expect(requestBackendPublic('/api/v1/public/ping')).resolves.toEqual({ ok: true });

    expect(mockSignOut).toHaveBeenCalled();
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/public/ping'),
      expect.objectContaining({
        headers: expect.not.objectContaining({
          Authorization: expect.any(String),
        }),
      }),
    );
  });

  it('public 요청도 caller-provided auth/role 헤더를 전달하지 않는다', async () => {
    await expect(requestBackendPublic('/api/v1/public/ping', {
      headers: {
        Authorization: 'Bearer forged.jwt.signature',
        apikey: 'forged-anon-key',
        'x-user-role': 'trainer',
        'x-user-id': 'attacker-user',
        'x-org-role': 'owner',
        'X-Trace-Id': 'trace-1',
      },
    })).resolves.toEqual({ ok: true });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/public/ping'),
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-Trace-Id': 'trace-1',
        }),
      }),
    );
    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.not.objectContaining({
          Authorization: expect.any(String),
          apikey: expect.any(String),
          'x-user-role': expect.any(String),
          'x-user-id': expect.any(String),
          'x-org-role': expect.any(String),
        }),
      }),
    );
  });

  it('public 요청은 JWT 형식이어도 검증 실패한 저장 토큰을 Authorization으로 보내지 않는다', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'header.payload.signature' } },
      error: null,
    });
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: new Error('JWT expired') });

    await expect(requestBackendPublic('/api/v1/public/ping')).resolves.toEqual({ ok: true });

    expect(mockGetUser).toHaveBeenCalledWith('header.payload.signature');
    expect(mockSignOut).toHaveBeenCalled();
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/public/ping'),
      expect.objectContaining({
        headers: expect.not.objectContaining({
          Authorization: expect.any(String),
        }),
      }),
    );
  });
});

describe('withBackendFallback logging', () => {
  it('redacts token and PII material from backend and fallback error logs', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const backendError = Object.assign(
      new Error('backend failed accessToken=secret-access parent@example.com'),
      {
        status: 502,
        details: {
          authorization_code: 'secret-code',
          serviceRoleKey: 'secret-service-role',
        },
      },
    );
    const fallbackError = new Error('fallback failed Bearer eyJhbGciOiJ.secret.payload 01012345678');

    await expect(withBackendFallback(
      async () => {
        throw backendError;
      },
      async () => {
        throw fallbackError;
      },
    )).rejects.toThrow(fallbackError);

    const output = JSON.stringify([
      warnSpy.mock.calls,
      errorSpy.mock.calls,
    ]);
    expect(output).not.toContain('secret-access');
    expect(output).not.toContain('parent@example.com');
    expect(output).not.toContain('secret-code');
    expect(output).not.toContain('secret-service-role');
    expect(output).not.toContain('eyJhbGciOiJ.secret.payload');
    expect(output).not.toContain('01012345678');
    expect(output).toContain('[REDACTED]');

    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });
});
