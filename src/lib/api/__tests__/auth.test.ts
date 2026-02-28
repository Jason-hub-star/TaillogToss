/**
 * auth.test.ts — loginWithToss / setSessionFromBridgeResponse 실패 경로 테스트
 * Parity: AUTH-001
 */

const mockInvoke = jest.fn();
const mockSetSession = jest.fn();
const mockGetUser = jest.fn();
const mockSignOut = jest.fn();
const mockIsConfigured = jest.fn().mockReturnValue(true);

jest.mock('lib/api/supabase', () => ({
  supabase: {
    functions: { invoke: (...args: unknown[]) => mockInvoke(...args) },
    auth: {
      setSession: (...args: unknown[]) => mockSetSession(...args),
      getUser: (...args: unknown[]) => mockGetUser(...args),
      signOut: (...args: unknown[]) => mockSignOut(...args),
    },
  },
  isSupabaseConfigured: () => mockIsConfigured(),
}));

import { loginWithToss, setSessionFromBridgeResponse } from '../auth';

beforeEach(() => {
  jest.clearAllMocks();
  mockIsConfigured.mockReturnValue(true);
  mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
  mockSignOut.mockResolvedValue({ error: null });
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
