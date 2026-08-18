/**
 * notification.test.ts — Smart Message protected Edge caller hardening
 * Parity: AUTH-001, MSG-001
 */

const mockInvoke = jest.fn();
const mockGetSession = jest.fn();
const mockGetUser = jest.fn();
const mockSignOut = jest.fn();
const mockRequestBackend = jest.fn();

jest.mock('../supabase', () => ({
  supabase: {
    functions: { invoke: (...args: unknown[]) => mockInvoke(...args) },
    auth: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
      getUser: (...args: unknown[]) => mockGetUser(...args),
      signOut: (...args: unknown[]) => mockSignOut(...args),
    },
  },
}));

jest.mock('../backend', () => ({
  requestBackend: (...args: unknown[]) => mockRequestBackend(...args),
}));

import { getNotificationHistory, markNotificationAsRead, sendSmartMessage } from '../notification';

const request = {
  user_id: 'user-1',
  notification_type: 'log_reminder',
  template: { template_set_code: 'tmpl-log-reminder' },
};

beforeEach(() => {
  jest.clearAllMocks();
  mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
  mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
  mockSignOut.mockResolvedValue({ error: null });
  mockInvoke.mockResolvedValue({ data: { ok: true }, error: null });
  mockRequestBackend.mockResolvedValue([]);
});

describe('sendSmartMessage auth guard', () => {
  it('세션이 없으면 protected Edge 호출을 보내지 않는다', async () => {
    await expect(sendSmartMessage(request as any)).rejects.toThrow('NO_SESSION');

    expect(mockGetUser).not.toHaveBeenCalled();
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it('저장 access token이 JWT 형식이 아니면 로그아웃 후 호출하지 않는다', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'sb_access_mock' } },
      error: null,
    });

    await expect(sendSmartMessage(request as any)).rejects.toThrow('INVALID_SESSION');

    expect(mockGetUser).not.toHaveBeenCalled();
    expect(mockSignOut).toHaveBeenCalled();
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it('JWT가 Supabase getUser 검증에 실패하면 Edge 호출 전에 차단한다', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'header.payload.signature' } },
      error: null,
    });
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: new Error('Invalid JWT') });

    await expect(sendSmartMessage(request as any)).rejects.toThrow('INVALID_SESSION');

    expect(mockGetUser).toHaveBeenCalledWith('header.payload.signature');
    expect(mockSignOut).toHaveBeenCalled();
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it('검증된 JWT만 Authorization 헤더에 붙인다', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'header.payload.signature' } },
      error: null,
    });

    await expect(sendSmartMessage(request as any)).resolves.toBeUndefined();

    expect(mockGetUser).toHaveBeenCalledWith('header.payload.signature');
    expect(mockInvoke).toHaveBeenCalledWith('send-smart-message', expect.objectContaining({
      body: expect.objectContaining({
        userId: 'user-1',
        notificationType: 'log_reminder',
        templateCode: 'tmpl-log-reminder',
      }),
      headers: { Authorization: 'Bearer header.payload.signature' },
    }));
  });
});

describe('notification history backend boundary', () => {
  it('이력 조회는 caller-provided userId로 Supabase noti_history를 직접 조회하지 않는다', async () => {
    mockRequestBackend.mockResolvedValue([
      {
        id: 'noti-1',
        user_id: 'verified-user',
        notification_type: 'log_reminder',
        channel: 'smart_message',
        template_set_code: 'tmpl-log-reminder',
        sent_at: '2026-06-01T00:00:00.000Z',
        success: true,
        error_code: null,
      },
    ]);

    await expect(getNotificationHistory('attacker-supplied-user')).resolves.toEqual([
      expect.objectContaining({
        id: 'noti-1',
        user_id: 'verified-user',
      }),
    ]);

    expect(mockRequestBackend).toHaveBeenCalledWith('/api/v1/notification/');
  });

  it('읽음 처리는 backend JWT identity에 묶인 endpoint만 호출한다', async () => {
    await expect(markNotificationAsRead('noti-1')).resolves.toBeUndefined();

    expect(mockRequestBackend).toHaveBeenCalledWith('/api/v1/notification/noti-1/read', {
      method: 'PATCH',
    });
  });
});
