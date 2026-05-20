/**
 * Cooldown Policy — Smart Message 발송 빈도/야간 금지 규칙을 검사한다.
 * Parity: MSG-001
 */

export interface CooldownRecord {
  userId: string;
  sentAt: number;
}

export interface CooldownDecision {
  allowed: boolean;
  reason?: 'QUIET_HOURS' | 'MIN_INTERVAL' | 'DAILY_LIMIT';
  retryAfterSeconds?: number;
}

export interface QuietHoursConfig {
  enabled: boolean;
  startHour: number;
  endHour: number;
}

const TEN_MINUTES_MS = 10 * 60 * 1000;
const DAILY_LIMIT = 3;

export function getKstHour(nowMs: number): number {
  const kstOffsetMs = 9 * 60 * 60 * 1000;
  const kstDate = new Date(nowMs + kstOffsetMs);
  return kstDate.getUTCHours();
}

export function getKstDayKey(nowMs: number): string {
  const kstOffsetMs = 9 * 60 * 60 * 1000;
  const kstDate = new Date(nowMs + kstOffsetMs);
  return kstDate.toISOString().slice(0, 10);
}

function normalizeHour(hour: number): number {
  if (!Number.isFinite(hour)) return 0;
  return ((Math.trunc(hour) % 24) + 24) % 24;
}

function isInQuietHours(hour: number, config?: QuietHoursConfig): boolean {
  const quietHours = config ?? { enabled: true, startHour: 22, endHour: 8 };
  if (!quietHours.enabled) return false;

  const start = normalizeHour(quietHours.startHour);
  const end = normalizeHour(quietHours.endHour);
  if (start === end) return true;
  if (start < end) return hour >= start && hour < end;
  return hour >= start || hour < end;
}

function getRetryHours(hour: number, config?: QuietHoursConfig): number {
  const quietHours = config ?? { enabled: true, startHour: 22, endHour: 8 };
  const end = normalizeHour(quietHours.endHour);
  if (hour < end) return end - hour;
  return 24 - hour + end;
}

export function evaluateCooldown(
  history: CooldownRecord[],
  userId: string,
  nowMs = Date.now(),
  quietHours?: QuietHoursConfig
): CooldownDecision {
  const hour = getKstHour(nowMs);
  if (isInQuietHours(hour, quietHours)) {
    return {
      allowed: false,
      reason: 'QUIET_HOURS',
      retryAfterSeconds: getRetryHours(hour, quietHours) * 60 * 60,
    };
  }

  const userHistory = history
    .filter((entry) => entry.userId === userId)
    .sort((a, b) => b.sentAt - a.sentAt);

  const latest = userHistory[0];
  if (latest) {
    const elapsed = nowMs - latest.sentAt;
    if (elapsed < TEN_MINUTES_MS) {
      return {
        allowed: false,
        reason: 'MIN_INTERVAL',
        retryAfterSeconds: Math.ceil((TEN_MINUTES_MS - elapsed) / 1000),
      };
    }
  }

  const todayKey = getKstDayKey(nowMs);
  const dailyCount = userHistory.filter((entry) => getKstDayKey(entry.sentAt) === todayKey).length;
  if (dailyCount >= DAILY_LIMIT) {
    return {
      allowed: false,
      reason: 'DAILY_LIMIT',
      retryAfterSeconds: 60 * 60,
    };
  }

  return { allowed: true };
}
