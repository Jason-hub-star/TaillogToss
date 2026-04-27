/**
 * mTLS Client — Toss S2S 호출을 감싸는 mock/real 구현체.
 * Real: Deno.createHttpClient + Base64 cert/key → Toss API Partner.
 * Mock: 개발/테스트용 더미 응답.
 * Parity: AUTH-001, IAP-001, MSG-001
 */

interface StatusError extends Error {
  status?: number;
  code?: string;
}

import type { TossEncryptedField } from './tossPiiDecrypt.ts';

type TossGenerateTokenReferrer = 'DEFAULT' | 'SANDBOX';

function readEnv(name: string): string | undefined {
  const fromNode = (globalThis as { process?: { env?: Record<string, string | undefined> } })
    .process?.env?.[name];
  if (fromNode) return fromNode;

  const fromDeno = (globalThis as { Deno?: { env?: { get: (key: string) => string | undefined } } })
    .Deno?.env?.get(name);
  return fromDeno;
}

export interface TossLoginProfile {
  userKey: string;
  email?: string | TossEncryptedField | null;
  name?: string | TossEncryptedField | null;
  phone?: string | TossEncryptedField | null;
  birthday?: string | TossEncryptedField | null;
  ci?: string | TossEncryptedField | null;
  gender?: string | TossEncryptedField | null;
  nationality?: string | TossEncryptedField | null;
  scope?: string[];
  agreedTerms?: Array<{ title?: string; required?: boolean; agreed?: boolean }>;
  isNewUser?: boolean;
}

export interface TossOrderVerification {
  tossStatus:
    | 'PURCHASED'
    | 'PAYMENT_COMPLETED'
    | 'FAILED'
    | 'REFUNDED'
    | 'ORDER_IN_PROGRESS'
    | 'NOT_FOUND';
  amount: number;
  tossOrderId: string;
  errorCode?: string;
}

export interface SmartMessageResult {
  messageId: string;
  sentAt: string;
}

export interface PointsKeyResult {
  grantKey: string;
  expiresAt: string;
}

export interface PointsGrantResult {
  status: 'SUCCESS' | 'FAILED';
  transactionId: string;
  errorCode?: '4100' | '4109' | '4110' | '4112' | '4113';
}

export interface MTLSClient {
  exchangeAuthorizationCode(
    authorizationCode: string,
    referrer?: TossGenerateTokenReferrer
  ): Promise<{ accessToken: string }>;
  fetchLoginProfile(accessToken: string): Promise<TossLoginProfile>;
  verifyIapOrder(request: {
    orderId: string;
    productId: string;
    transactionId: string;
  }): Promise<TossOrderVerification>;
  sendSmartMessage(request: {
    userId: string;
    templateCode: string;
    variables: Record<string, string>;
  }): Promise<SmartMessageResult>;
  getPointsGrantKey(): Promise<PointsKeyResult>;
  executePointsGrant(request: {
    grantKey: string;
    userId: string;
    points: number;
    reasonCode: string;
  }): Promise<{ executionId: string }>;
  getPointsGrantResult(executionId: string): Promise<PointsGrantResult>;
}

const PRIMARY_TOSS_API_BASE = readEnv('TOSS_API_BASE')?.trim() || 'https://apps-in-toss-api.toss.im';
const SECONDARY_TOSS_API_BASE = 'https://api-partner.toss.im';
const TOSS_APP_PATH = '/api-partner/v1/apps-in-toss';

function unwrapTossSuccess<T>(payload: unknown, label: string): T {
  if (!payload || typeof payload !== 'object') {
    throw new Error(`Invalid Toss ${label} response`);
  }

  const row = payload as Record<string, unknown>;
  const resultType = row.resultType;
  if (typeof resultType === 'string' && resultType !== 'SUCCESS') {
    const errorPayload = row.error as Record<string, unknown> | undefined;
    const reason = typeof errorPayload?.reason === 'string' ? errorPayload.reason : 'unknown';
    const code = typeof errorPayload?.code === 'string' ? errorPayload.code : undefined;
    throw new Error(
      `Toss ${label} failed: reason=${reason}${code ? ` code=${code}` : ''}`
    );
  }

  if (resultType === 'SUCCESS' && row.success && typeof row.success === 'object') {
    return row.success as T;
  }

  if (row.success && typeof row.success === 'object') {
    return row.success as T;
  }

  return row as T;
}

class RealMTLSClient implements MTLSClient {
  private httpClient: Deno.HttpClient;

  constructor() {
    const certChain = Deno.env.get('TOSS_CLIENT_CERT_BASE64');
    const privateKey = Deno.env.get('TOSS_CLIENT_KEY_BASE64');
    if (!certChain || !privateKey) {
      throw new Error('TOSS_CLIENT_CERT_BASE64 and TOSS_CLIENT_KEY_BASE64 must be set');
    }
    const decodedCert = atob(certChain);
    const decodedKey = atob(privateKey);

    // Runtime compatibility: prefer legacy cert/key first (verified in prior sandbox success),
    // then fall back to certChain/privateKey for newer runtimes.
    try {
      const legacyOptions = {
        cert: decodedCert,
        key: decodedKey,
      } as unknown as Parameters<typeof Deno.createHttpClient>[0];
      this.httpClient = Deno.createHttpClient(legacyOptions);
    } catch {
      this.httpClient = Deno.createHttpClient({
        certChain: decodedCert,
        privateKey: decodedKey,
      });
    }
  }

  private async request<T>(
    method: string,
    path: string,
    options?: { body?: unknown; headers?: Record<string, string> },
  ): Promise<T> {
    const baseCandidates = [PRIMARY_TOSS_API_BASE];
    if (PRIMARY_TOSS_API_BASE !== SECONDARY_TOSS_API_BASE) {
      baseCandidates.push(SECONDARY_TOSS_API_BASE);
    }

    let lastError: unknown;

    for (const baseUrl of baseCandidates) {
      const url = `${baseUrl}${path}`;

      try {
        const res = await fetch(url, {
          method,
          client: this.httpClient,
          headers: {
            'Content-Type': 'application/json',
            ...options?.headers,
          },
          body: options?.body ? JSON.stringify(options.body) : undefined,
        } as RequestInit & { client: Deno.HttpClient });

        if (!res.ok) {
          const text = await res.text().catch(() => '');
          const error = new Error(
            `Toss API ${method} ${path} failed (${baseUrl}): ${res.status} ${text}`
          ) as StatusError;
          error.status = res.status;
          error.code = 'TOSS_UPSTREAM_ERROR';

          if (res.status >= 500 && baseUrl !== baseCandidates[baseCandidates.length - 1]) {
            lastError = error;
            continue;
          }

          throw error;
        }

        return res.json();
      } catch (error) {
        const normalized = (error instanceof Error ? error : new Error(String(error))) as StatusError;
        if (!normalized.code) {
          normalized.code = typeof normalized.status === 'number'
            ? 'TOSS_UPSTREAM_ERROR'
            : 'TOSS_UPSTREAM_NETWORK';
        }
        const status = normalized.status;
        lastError = normalized;

        if (status && status < 500) {
          throw normalized;
        }

        if (baseUrl === baseCandidates[baseCandidates.length - 1]) {
          throw normalized;
        }
      }
    }

    throw lastError ?? new Error(`Toss API ${method} ${path} failed on all upstreams`);
  }

  async exchangeAuthorizationCode(
    authorizationCode: string,
    referrer: TossGenerateTokenReferrer = 'DEFAULT'
  ): Promise<{ accessToken: string }> {
    const payload = await this.request<unknown>(
      'POST',
      `${TOSS_APP_PATH}/user/oauth2/generate-token`,
      { body: { authorizationCode, referrer } },
    );
    const result = unwrapTossSuccess<{ accessToken?: string; access_token?: string }>(
      payload,
      'generate-token'
    );
    const accessToken = result.accessToken ?? result.access_token;
    if (!accessToken) {
      const preview = JSON.stringify(payload).slice(0, 220);
      throw new Error(`Toss generate-token response has no accessToken: ${preview}`);
    }
    return { accessToken };
  }

  async fetchLoginProfile(accessToken: string): Promise<TossLoginProfile> {
    const payload = await this.request<unknown>(
      'GET',
      `${TOSS_APP_PATH}/user/oauth2/login-me`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    const result = unwrapTossSuccess<Record<string, unknown>>(payload, 'login-me');
    const userKey = result.userKey ?? result.user_key;
    if (typeof userKey !== 'string' && typeof userKey !== 'number') {
      const preview = JSON.stringify(payload).slice(0, 220);
      throw new Error(`Toss login-me response has no userKey: ${preview}`);
    }

    return {
      userKey: String(userKey),
      email: (result.email ?? null) as TossLoginProfile['email'],
      name: (result.name ?? null) as TossLoginProfile['name'],
      phone: (result.phone ?? null) as TossLoginProfile['phone'],
      birthday: (result.birthday ?? null) as TossLoginProfile['birthday'],
      ci: (result.ci ?? null) as TossLoginProfile['ci'],
      gender: (result.gender ?? null) as TossLoginProfile['gender'],
      nationality: (result.nationality ?? null) as TossLoginProfile['nationality'],
      scope: Array.isArray(result.scope) ? result.scope.filter((v) => typeof v === 'string') as string[] : undefined,
      agreedTerms: Array.isArray(result.agreedTerms)
        ? result.agreedTerms.filter((v) => !!v && typeof v === 'object') as TossLoginProfile['agreedTerms']
        : undefined,
      isNewUser: typeof result.isNewUser === 'boolean'
        ? result.isNewUser
        : (typeof result.is_new_user === 'boolean' ? result.is_new_user : undefined),
    };
  }

  async verifyIapOrder(request: {
    orderId: string;
    productId: string;
    transactionId: string;
  }): Promise<TossOrderVerification> {
    return this.request<TossOrderVerification>(
      'POST',
      `${TOSS_APP_PATH}/iap/verify-order`,
      { body: request },
    );
  }

  async sendSmartMessage(request: {
    userId: string;
    templateCode: string;
    variables: Record<string, string>;
  }): Promise<SmartMessageResult> {
    // Toss API: body는 templateSetCode + context, userId는 x-toss-user-key 헤더
    return this.request<SmartMessageResult>(
      'POST',
      `${TOSS_APP_PATH}/messenger/send-message`,
      {
        body: {
          templateSetCode: request.templateCode,
          context: request.variables,
        },
        headers: {
          'x-toss-user-key': request.userId,
        },
      },
    );
  }

  async getPointsGrantKey(): Promise<PointsKeyResult> {
    return this.request<PointsKeyResult>(
      'POST',
      `${TOSS_APP_PATH}/points/grant-key`,
    );
  }

  async executePointsGrant(request: {
    grantKey: string;
    userId: string;
    points: number;
    reasonCode: string;
  }): Promise<{ executionId: string }> {
    return this.request<{ executionId: string }>(
      'POST',
      `${TOSS_APP_PATH}/points/grant`,
      { body: request },
    );
  }

  async getPointsGrantResult(executionId: string): Promise<PointsGrantResult> {
    return this.request<PointsGrantResult>(
      'GET',
      `${TOSS_APP_PATH}/points/grant-result/${executionId}`,
    );
  }
}

class MockMTLSClient implements MTLSClient {
  private readonly retryCounter = new Map<string, number>();

  async exchangeAuthorizationCode(
    authorizationCode: string
  ): Promise<{ accessToken: string }> {
    if (!authorizationCode.trim()) {
      const error = new Error('Invalid authorization code') as StatusError;
      error.status = 400;
      throw error;
    }

    return { accessToken: `mock_access_${authorizationCode}` };
  }

  async fetchLoginProfile(accessToken: string): Promise<TossLoginProfile> {
    const userKey = accessToken.replace('mock_access_', '').trim() || 'unknown';
    return {
      userKey: `toss_${userKey}`,
      email: null,
      name: null,
      isNewUser: !userKey.startsWith('existing_'),
    };
  }

  async verifyIapOrder(request: {
    orderId: string;
    productId: string;
    transactionId: string;
  }): Promise<TossOrderVerification> {
    const key = `${request.orderId}:${request.transactionId}`;
    const currentAttempts = this.retryCounter.get(key) ?? 0;

    if (request.orderId.includes('retry-500') && currentAttempts === 0) {
      this.retryCounter.set(key, currentAttempts + 1);
      const transient = new Error('Temporary Toss upstream issue') as StatusError;
      transient.status = 503;
      throw transient;
    }

    if (request.orderId.includes('not-found')) {
      return {
        tossStatus: 'NOT_FOUND',
        amount: 0,
        tossOrderId: request.orderId,
      };
    }

    if (request.orderId.includes('refund')) {
      return {
        tossStatus: 'REFUNDED',
        amount: 4900,
        tossOrderId: request.orderId,
      };
    }

    if (request.orderId.includes('fail')) {
      return {
        tossStatus: 'FAILED',
        amount: 0,
        tossOrderId: request.orderId,
        errorCode: 'IAP_VERIFY_FAILED',
      };
    }

    return {
      tossStatus: 'PAYMENT_COMPLETED',
      amount: request.productId.includes('token') ? 1900 : 4900,
      tossOrderId: request.orderId,
    };
  }

  async sendSmartMessage(request: {
    userId: string;
    templateCode: string;
    variables: Record<string, string>;
  }): Promise<SmartMessageResult> {
    const keys = Object.keys(request.variables).join('-');
    const messageId = `msg_${request.userId}_${request.templateCode}_${keys || 'none'}`;
    return {
      messageId,
      sentAt: new Date().toISOString(),
    };
  }

  async getPointsGrantKey(): Promise<PointsKeyResult> {
    return {
      grantKey: `grant_${Date.now().toString(36)}`,
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    };
  }

  async executePointsGrant(request: {
    grantKey: string;
    userId: string;
    points: number;
    reasonCode: string;
  }): Promise<{ executionId: string }> {
    const executionId = `exec_${request.userId}_${request.points}_${request.reasonCode}_${request.grantKey}`;
    return { executionId };
  }

  async getPointsGrantResult(executionId: string): Promise<PointsGrantResult> {
    if (executionId.includes('error-4109')) {
      return {
        status: 'FAILED',
        transactionId: executionId,
        errorCode: '4109',
      };
    }

    return {
      status: 'SUCCESS',
      transactionId: executionId,
    };
  }
}

export function createMTLSClient(mode: 'mock' | 'real' = 'mock'): MTLSClient {
  if (mode === 'real') {
    return new RealMTLSClient();
  }
  return new MockMTLSClient();
}
