import { createMTLSClient } from '../mTLSClient.ts';

const originalDeno = (globalThis as { Deno?: unknown }).Deno;
const originalFetch = globalThis.fetch;
const originalEnv = process.env;

function encode(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64');
}

describe('mTLSClient real mode fail-closed behavior', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    (globalThis as { Deno?: unknown }).Deno = originalDeno;
    globalThis.fetch = originalFetch;
  });

  test('real mode refuses to start without client cert and key secrets', () => {
    delete process.env.TOSS_CLIENT_CERT_BASE64;
    delete process.env.TOSS_CLIENT_KEY_BASE64;
    (globalThis as { Deno?: unknown }).Deno = {
      createHttpClient: jest.fn(),
    };

    expect(() => createMTLSClient('real')).toThrow(
      'TOSS_CLIENT_CERT_BASE64 and TOSS_CLIENT_KEY_BASE64 must be set',
    );
  });

  test('real mode refuses to fall back to a non-mTLS runtime', () => {
    process.env.TOSS_CLIENT_CERT_BASE64 = encode('cert');
    process.env.TOSS_CLIENT_KEY_BASE64 = encode('key');
    (globalThis as { Deno?: unknown }).Deno = {};

    expect(() => createMTLSClient('real')).toThrow(
      'Deno.createHttpClient is required for real Toss mTLS calls',
    );
  });

  test('real mode creates a Deno mTLS HTTP client from decoded cert secrets', () => {
    process.env.TOSS_CLIENT_CERT_BASE64 = encode('decoded-cert');
    process.env.TOSS_CLIENT_KEY_BASE64 = encode('decoded-key');
    const createHttpClient = jest.fn(() => ({ id: 'mtls-client' }));
    (globalThis as { Deno?: unknown }).Deno = { createHttpClient };

    createMTLSClient('real');

    expect(createHttpClient).toHaveBeenCalledWith({
      cert: 'decoded-cert',
      key: 'decoded-key',
    });
  });

  test('real mode propagates Toss upstream network failures instead of returning success', async () => {
    process.env.TOSS_CLIENT_CERT_BASE64 = encode('decoded-cert');
    process.env.TOSS_CLIENT_KEY_BASE64 = encode('decoded-key');
    (globalThis as { Deno?: unknown }).Deno = {
      createHttpClient: jest.fn(() => ({ id: 'mtls-client' })),
    };
    globalThis.fetch = jest.fn(async () => {
      throw new Error('mTLS handshake failed');
    }) as unknown as typeof fetch;

    const client = createMTLSClient('real');

    await expect(client.exchangeAuthorizationCode('auth-code', 'SANDBOX')).rejects.toMatchObject({
      code: 'TOSS_UPSTREAM_NETWORK',
    });
    await expect(client.fetchLoginProfile('access-token')).rejects.toMatchObject({
      code: 'TOSS_UPSTREAM_NETWORK',
    });
    await expect(
      client.verifyIapOrder({
        orderId: 'order-1',
        productId: 'product-1',
        transactionId: 'tx-1',
        userKey: 'toss-user-1',
      })
    ).rejects.toMatchObject({
      code: 'TOSS_UPSTREAM_NETWORK',
    });
    await expect(
      client.sendSmartMessage({
        userId: 'toss-user-1',
        templateCode: 'taillog-app-TAILLOG_BEHAVIOR_REMIND',
        variables: {},
      })
    ).rejects.toMatchObject({
      code: 'TOSS_UPSTREAM_NETWORK',
    });
    await expect(client.getPointsGrantKey()).rejects.toMatchObject({
      code: 'TOSS_UPSTREAM_NETWORK',
    });
    await expect(
      client.executePointsGrant({
        grantKey: 'grant-1',
        userId: 'toss-user-1',
        points: 100,
        reasonCode: 'referral_reward',
      })
    ).rejects.toMatchObject({
      code: 'TOSS_UPSTREAM_NETWORK',
    });
    await expect(client.getPointsGrantResult('exec-1')).rejects.toMatchObject({
      code: 'TOSS_UPSTREAM_NETWORK',
    });
  });
});
