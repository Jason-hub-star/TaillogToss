/**
 * Startup performance markers — separate host/Metro time from app bootstrap time.
 * Parity: APP-001
 */

interface StartupPerformanceInit {
  loadingStartTs?: number;
  scheme?: string;
}

export type StartupPerformanceMeta = Record<string, string | number | boolean | null | undefined>;

let jsStartTs = Date.now();
let loadingStartTs: number | null = null;
const markedOnce = new Set<string>();
const startupPerfLoggingEnabled = process.env.NODE_ENV !== 'test';

function isValidTimestamp(value: number | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

export function initStartupPerformance({ loadingStartTs: initialLoadingStartTs, scheme }: StartupPerformanceInit) {
  jsStartTs = Date.now();
  loadingStartTs = isValidTimestamp(initialLoadingStartTs) ? initialLoadingStartTs : null;
  markedOnce.clear();
  markStartupPerformance('js_entry', { scheme });
}

export function markStartupPerformance(label: string, meta?: StartupPerformanceMeta) {
  if (!startupPerfLoggingEnabled) return;

  const now = Date.now();
  const payload = {
    label,
    fromLoadingStartMs: loadingStartTs ? now - loadingStartTs : null,
    fromJsStartMs: now - jsStartTs,
    ...(meta ?? {}),
  };

  console.log('[PERF][startup]', payload);
}

export function markStartupPerformanceOnce(label: string, meta?: StartupPerformanceMeta) {
  if (markedOnce.has(label)) return;
  markedOnce.add(label);
  markStartupPerformance(label, meta);
}

function getErrorMeta(error: unknown): StartupPerformanceMeta {
  if (!error || typeof error !== 'object') {
    return { errorMessage: String(error) };
  }
  const maybeError = error as { name?: unknown; message?: unknown; status?: unknown };
  return {
    errorName: typeof maybeError.name === 'string' ? maybeError.name : null,
    errorMessage: typeof maybeError.message === 'string' ? maybeError.message.slice(0, 120) : null,
    status: typeof maybeError.status === 'number' ? maybeError.status : null,
  };
}

export async function measureStartupAsync<T>(
  label: string,
  meta: StartupPerformanceMeta,
  task: () => Promise<T>,
): Promise<T> {
  const startedAt = Date.now();
  markStartupPerformance(`${label}_start`, meta);

  try {
    const result = await task();
    markStartupPerformance(`${label}_done`, {
      ...meta,
      durationMs: Date.now() - startedAt,
    });
    return result;
  } catch (error) {
    markStartupPerformance(`${label}_failed`, {
      ...meta,
      durationMs: Date.now() - startedAt,
      ...getErrorMeta(error),
    });
    throw error;
  }
}
