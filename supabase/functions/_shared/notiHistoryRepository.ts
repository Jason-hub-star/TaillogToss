/**
 * notiHistoryRepository — Smart Message 이력 조회/영속 기록을 담당한다.
 * Parity: MSG-001
 */

import { type CooldownRecord } from './cooldownPolicy.ts';

type NotiChannel = 'ALIMTALK' | 'WEB_PUSH' | 'EMAIL';

interface NotiHistoryRow {
  user_id: string;
  sent_at: string;
  template_set_code: string | null;
  notification_type: string | null;
  success: boolean;
  error_code: string | null;
  idempotency_key: string | null;
}

interface NotiHistoryInsertRow {
  user_id: string;
  channel: NotiChannel;
  template_code: string;
  template_set_code: string;
  sent_at: string;
  notification_type: string;
  success: boolean;
  error_code: string | null;
  idempotency_key: string;
  provider_channels: string[];
}

export interface WriteNotiHistoryInput {
  userId: string;
  templateCode: string;
  notificationType: string;
  idempotencyKey: string;
  sentAt: string;
  success: boolean;
  errorCode?: string | null;
  providerChannels?: string[];
}

export interface PersistedNotiHistory {
  user_id: string;
  template_set_code: string;
  sent_at: string;
  notification_type: string;
  success: boolean;
  error_code: string | null;
  idempotency_key: string;
}

export interface NotiHistoryRepository {
  listCooldownHistory(userId: string, nowMs: number): Promise<CooldownRecord[]>;
  writeHistory(input: WriteNotiHistoryInput): Promise<PersistedNotiHistory>;
}

const COOLDOWN_LOOKBACK_MS = 2 * 24 * 60 * 60 * 1000;

function getEnv(name: string): string | undefined {
  const denoRuntime = (globalThis as { Deno?: { env?: { get: (key: string) => string | undefined } } }).Deno;
  if (denoRuntime?.env?.get) {
    try {
      return denoRuntime.env.get(name);
    } catch {
      // ignore Deno env access errors in non-edge runtimes.
    }
  }

  if (typeof process !== 'undefined') {
    return process.env[name];
  }

  return undefined;
}

class InMemoryNotiHistoryRepository implements NotiHistoryRepository {
  constructor(private readonly history: CooldownRecord[]) {}

  async listCooldownHistory(userId: string): Promise<CooldownRecord[]> {
    return this.history.filter((entry) => entry.userId === userId);
  }

  async writeHistory(input: WriteNotiHistoryInput): Promise<PersistedNotiHistory> {
    const sentAtMs = Date.parse(input.sentAt);
    this.history.push({
      userId: input.userId,
      sentAt: Number.isNaN(sentAtMs) ? Date.now() : sentAtMs,
    });

    return {
      user_id: input.userId,
      template_set_code: input.templateCode,
      sent_at: input.sentAt,
      notification_type: input.notificationType,
      success: input.success,
      error_code: input.errorCode ?? null,
      idempotency_key: input.idempotencyKey,
    };
  }
}

interface RestNotiHistoryRow {
  user_id: string;
  sent_at: string;
}

class RestNotiHistoryRepository implements NotiHistoryRepository {
  constructor(
    private readonly projectUrl: string,
    private readonly serviceRoleKey: string
  ) {}

  private buildHeaders(extra?: Record<string, string>): Record<string, string> {
    return {
      apikey: this.serviceRoleKey,
      Authorization: `Bearer ${this.serviceRoleKey}`,
      'Content-Type': 'application/json',
      ...extra,
    };
  }

  private async readJson<T>(response: Response): Promise<T> {
    const text = await response.text();
    if (!text) {
      return [] as T;
    }
    return JSON.parse(text) as T;
  }

  async listCooldownHistory(userId: string, nowMs: number): Promise<CooldownRecord[]> {
    const sinceIso = new Date(nowMs - COOLDOWN_LOOKBACK_MS).toISOString();
    const url =
      `${this.projectUrl}/rest/v1/noti_history` +
      `?select=user_id,sent_at` +
      `&user_id=eq.${encodeURIComponent(userId)}` +
      `&sent_at=gte.${encodeURIComponent(sinceIso)}` +
      `&order=sent_at.desc` +
      `&limit=100`;

    const response = await fetch(url, {
      method: 'GET',
      headers: this.buildHeaders(),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Failed to load cooldown history: ${response.status} ${errorBody}`);
    }

    const data = await this.readJson<RestNotiHistoryRow[]>(response);
    return (data ?? [])
      .map((row) => ({
        userId: row.user_id ?? userId,
        sentAt: Date.parse(row.sent_at ?? ''),
      }))
      .filter((row) => Number.isFinite(row.sentAt));
  }

  async writeHistory(input: WriteNotiHistoryInput): Promise<PersistedNotiHistory> {
    const payload: NotiHistoryInsertRow = {
      user_id: input.userId,
      channel: 'ALIMTALK',
      template_code: input.templateCode,
      template_set_code: input.templateCode,
      sent_at: input.sentAt,
      notification_type: input.notificationType,
      success: input.success,
      error_code: input.errorCode ?? null,
      idempotency_key: input.idempotencyKey,
      provider_channels: input.providerChannels ?? ['SMART_MESSAGE'],
    };

    const url =
      `${this.projectUrl}/rest/v1/noti_history` +
      `?select=user_id,sent_at,template_set_code,notification_type,success,error_code,idempotency_key`;
    const response = await fetch(url, {
      method: 'POST',
      headers: this.buildHeaders({ Prefer: 'return=representation' }),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Failed to write noti_history: ${response.status} ${errorBody}`);
    }

    const rows = await this.readJson<NotiHistoryRow[]>(response);
    const data = rows[0];
    if (!data) {
      throw new Error('Failed to write noti_history: empty response');
    }

    return {
      user_id: data.user_id,
      template_set_code: data.template_set_code ?? input.templateCode,
      sent_at: data.sent_at,
      notification_type: data.notification_type ?? input.notificationType,
      success: data.success,
      error_code: data.error_code,
      idempotency_key: data.idempotency_key ?? input.idempotencyKey,
    };
  }
}

let cachedServiceRepository: NotiHistoryRepository | null = null;

function getServiceRepository(): NotiHistoryRepository | null {
  if (cachedServiceRepository) return cachedServiceRepository;

  const url = getEnv('SUPABASE_URL');
  const serviceRoleKey =
    getEnv('SUPABASE_SERVICE_ROLE_KEY') ??
    getEnv('SERVICE_ROLE_KEY');

  if (!url || !serviceRoleKey) {
    return null;
  }

  cachedServiceRepository = new RestNotiHistoryRepository(url, serviceRoleKey);
  return cachedServiceRepository;
}

export function createNotiHistoryRepository(options?: {
  history?: CooldownRecord[];
}): NotiHistoryRepository {
  const serviceRepository = getServiceRepository();
  if (serviceRepository) {
    return serviceRepository;
  }

  return new InMemoryNotiHistoryRepository(options?.history ?? []);
}
