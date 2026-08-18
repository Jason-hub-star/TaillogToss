/**
 * auth.test.ts — loginWithToss / setSessionFromBridgeResponse 실패 경로 테스트
 * Parity: AUTH-001
 */

const mockInvoke = jest.fn();
const mockSetSession = jest.fn();
const mockGetUser = jest.fn();
const mockSignOut = jest.fn();
const mockUpdateUser = jest.fn();
const mockRefreshSession = jest.fn();
const mockGetSession = jest.fn();
const mockStorageSetItem = jest.fn();
const mockStorageGetItem = jest.fn();
const mockStorageRemoveItem = jest.fn();
const mockIsConfigured = jest.fn().mockReturnValue(true);

jest.mock('@apps-in-toss/framework', () => ({
  Storage: {
    setItem: (...args: unknown[]) => mockStorageSetItem(...args),
    getItem: (...args: unknown[]) => mockStorageGetItem(...args),
    removeItem: (...args: unknown[]) => mockStorageRemoveItem(...args),
  },
}));

jest.mock('lib/api/supabase', () => ({
  supabase: {
    functions: { invoke: (...args: unknown[]) => mockInvoke(...args) },
    auth: {
      setSession: (...args: unknown[]) => mockSetSession(...args),
      getUser: (...args: unknown[]) => mockGetUser(...args),
      signOut: (...args: unknown[]) => mockSignOut(...args),
      updateUser: (...args: unknown[]) => mockUpdateUser(...args),
      refreshSession: (...args: unknown[]) => mockRefreshSession(...args),
      getSession: (...args: unknown[]) => mockGetSession(...args),
    },
  },
  isSupabaseConfigured: () => mockIsConfigured(),
}));

import { assignB2BRole, getSession, loginWithToss, setSessionFromBridgeResponse, withdrawUser } from '../auth';

beforeEach(() => {
  jest.clearAllMocks();
  mockIsConfigured.mockReturnValue(true);
  mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
  mockSignOut.mockResolvedValue({ error: null });
  mockUpdateUser.mockResolvedValue({ error: null });
  mockRefreshSession.mockResolvedValue({ error: null });
  mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
  mockStorageSetItem.mockResolvedValue(undefined);
  mockStorageGetItem.mockResolvedValue(null);
  mockStorageRemoveItem.mockResolvedValue(undefined);
});

describe('loginWithToss', () => {
  it('Supabase 미설정 시 SUPABASE_ENV_MISSING 에러', async () => {
    mockIsConfigured.mockReturnValue(false);
    await expect(loginWithToss('code123')).rejects.toThrow('SUPABASE_ENV_MISSING');
  });

  it('Edge Function invoke 에러 시 에러 전파', async () => {
    mockInvoke.mockResolvedValue({ data: null, error: new Error('Network error') });
    await expect(loginWithToss('code123')).rejects.toThrow('Network error');
  });

  it('400 잘못된 authCode 시 에러 코드 포함', async () => {
    mockInvoke.mockResolvedValue({
      data: {
        ok: false,
        error: { code: 'INVALID_AUTH_CODE', message: 'Bad code' },
      },
      error: null,
    });
    await expect(loginWithToss('bad-code')).rejects.toThrow('INVALID_AUTH_CODE');
  });

  it('envelope.data 없음 시 EDGE_RESPONSE_ERROR', async () => {
    mockInvoke.mockResolvedValue({
      data: { ok: false, data: null },
      error: null,
    });
    await expect(loginWithToss('code123')).rejects.toThrow('EDGE_RESPONSE_ERROR');
  });

  it('성공 시 TossLoginResponse 반환', async () => {
    const mockResponse = {
      access_token: 'header.payload.signature',
      refresh_token: 'header.payload.sig2',
      user: { id: 'user-1' },
      is_new_user: true,
    };
    mockInvoke.mockResolvedValue({
      data: { ok: true, data: mockResponse },
      error: null,
    });

    const result = await loginWithToss('valid-code', 'SANDBOX');
    expect(result).toEqual(mockResponse);
    expect(mockInvoke).toHaveBeenCalledWith('login-with-toss', expect.objectContaining({
      body: expect.objectContaining({
        authorizationCode: 'valid-code',
        referrer: 'SANDBOX',
        flow: 'B2C',
      }),
    }));
  });

  it('referrer가 없으면 DEFAULT로 보정', async () => {
    const mockResponse = {
      access_token: 'header.payload.signature',
      refresh_token: 'header.payload.sig2',
      user: { id: 'user-1' },
      is_new_user: false,
    };
    mockInvoke.mockResolvedValue({
      data: { ok: true, data: mockResponse },
      error: null,
    });

    await loginWithToss('valid-code');
    expect(mockInvoke).toHaveBeenCalledWith('login-with-toss', expect.objectContaining({
      body: expect.objectContaining({
        authorizationCode: 'valid-code',
        referrer: 'DEFAULT',
        flow: 'B2C',
      }),
    }));
  });

  it('B2B 플로우를 명시하면 Edge body에 B2B로 전달', async () => {
    const mockResponse = {
      access_token: 'header.payload.signature',
      refresh_token: 'header.payload.sig2',
      user: { id: 'user-1' },
      is_new_user: false,
    };
    mockInvoke.mockResolvedValue({
      data: { ok: true, data: mockResponse },
      error: null,
    });

    await loginWithToss('valid-code', 'SANDBOX', 'B2B');
    expect(mockInvoke).toHaveBeenCalledWith('login-with-toss', expect.objectContaining({
      body: expect.objectContaining({
        authorizationCode: 'valid-code',
        referrer: 'SANDBOX',
        flow: 'B2B',
      }),
    }));
  });
});

describe('setSessionFromBridgeResponse', () => {
  it('토큰 누락 시 INVALID_BRIDGE_TOKENS', async () => {
    await expect(
      setSessionFromBridgeResponse({ access_token: '', refresh_token: '' } as any),
    ).rejects.toThrow('INVALID_BRIDGE_TOKENS');
  });

  it('mock 토큰 (non-JWT) 시 false 반환, setSession 미호출', async () => {
    const result = await setSessionFromBridgeResponse({
      access_token: 'sb_access_mock',
      refresh_token: 'sb_refresh_mock',
    } as any);

    expect(result).toBe(false);
    expect(mockSetSession).not.toHaveBeenCalled();
  });

  it('access token이 JWT면 refresh token 비JWT여도 setSession 호출', async () => {
    mockSetSession.mockResolvedValue({ error: null });

    const result = await setSessionFromBridgeResponse({
      access_token: 'header.payload.signature',
      refresh_token: 'plain-refresh-token',
    } as any);

    expect(result).toBe(true);
    expect(mockSetSession).toHaveBeenCalledWith({
      access_token: 'header.payload.signature',
      refresh_token: 'plain-refresh-token',
    });
  });

  it('setSession 후 getUser 검증 실패면 false 반환 + signOut', async () => {
    mockSetSession.mockResolvedValue({ error: null });
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: new Error('Invalid JWT') });

    const result = await setSessionFromBridgeResponse({
      access_token: 'header.payload.signature',
      refresh_token: 'plain-refresh-token',
    } as any);

    expect(result).toBe(false);
    expect(mockSignOut).toHaveBeenCalled();
  });
});

describe('getSession', () => {
  it('세션이 없으면 null 반환', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });

    await expect(getSession()).resolves.toBeNull();
    expect(mockGetUser).not.toHaveBeenCalled();
  });

  it('저장 세션 access token이 non-JWT면 signOut 후 null 반환', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'sb_access_mock', user: { id: 'user-1' } } },
      error: null,
    });

    await expect(getSession()).resolves.toBeNull();
    expect(mockGetUser).not.toHaveBeenCalled();
    expect(mockSignOut).toHaveBeenCalled();
  });

  it('저장 세션 JWT가 Supabase getUser 검증에 실패하면 signOut 후 null 반환', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'header.payload.signature', user: { id: 'user-1' } } },
      error: null,
    });
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: new Error('Invalid JWT') });

    await expect(getSession()).resolves.toBeNull();
    expect(mockGetUser).toHaveBeenCalledWith('header.payload.signature');
    expect(mockSignOut).toHaveBeenCalled();
  });

  it('저장 세션 JWT가 Supabase getUser 검증을 통과하면 세션 반환', async () => {
    const session = { access_token: 'header.payload.signature', user: { id: 'user-1' } };
    mockGetSession.mockResolvedValue({ data: { session }, error: null });

    await expect(getSession()).resolves.toBe(session);
    expect(mockGetUser).toHaveBeenCalledWith('header.payload.signature');
    expect(mockSignOut).not.toHaveBeenCalled();
  });
});

describe('protected Edge callers', () => {
  it('withdrawUser는 JWT 형식이 아닌 저장 세션을 Edge에 보내지 않고 로그아웃한다', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'sb_access_mock' } },
      error: null,
    });

    await expect(withdrawUser('user-1')).rejects.toThrow('INVALID_SESSION');

    expect(mockGetUser).not.toHaveBeenCalled();
    expect(mockSignOut).toHaveBeenCalled();
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it('withdrawUser는 JWT 검증 실패 시 Edge 호출 전에 차단한다', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'header.payload.signature' } },
      error: null,
    });
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: new Error('Invalid JWT') });

    await expect(withdrawUser('user-1')).rejects.toThrow('INVALID_SESSION');

    expect(mockGetUser).toHaveBeenCalledWith('header.payload.signature');
    expect(mockSignOut).toHaveBeenCalled();
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it('withdrawUser는 세션이 비어 있으면 refresh 후 검증된 JWT만 전달한다', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
    mockRefreshSession.mockResolvedValue({
      data: { session: { access_token: 'header.payload.signature' } },
      error: null,
    });
    mockInvoke.mockResolvedValue({ data: { ok: true }, error: null });

    await expect(withdrawUser('user-1')).resolves.toBeUndefined();

    expect(mockGetUser).toHaveBeenCalledWith('header.payload.signature');
    expect(mockInvoke).toHaveBeenCalledWith('withdraw-user', expect.objectContaining({
      body: { userId: 'user-1' },
      headers: { Authorization: 'Bearer header.payload.signature' },
    }));
  });

  it('assignB2BRole은 JWT 검증 실패 시 Edge 호출 전에 차단한다', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'header.payload.signature' } },
      error: null,
    });
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: new Error('Invalid JWT') });

    await expect(assignB2BRole('trainer')).rejects.toThrow('INVALID_SESSION');

    expect(mockGetUser).toHaveBeenCalledWith('header.payload.signature');
    expect(mockSignOut).toHaveBeenCalled();
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it('assignB2BRole은 검증된 JWT만 Authorization 헤더에 붙인다', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'header.payload.signature' } },
      error: null,
    });
    mockInvoke.mockResolvedValue({ data: { ok: true }, error: null });

    await expect(assignB2BRole('org_owner')).resolves.toBeUndefined();

    expect(mockGetUser).toHaveBeenCalledWith('header.payload.signature');
    expect(mockInvoke).toHaveBeenCalledWith('assign-b2b-role', expect.objectContaining({
      body: { role: 'org_owner' },
      headers: { Authorization: 'Bearer header.payload.signature' },
    }));
    expect(mockRefreshSession).toHaveBeenCalled();
  });
});
