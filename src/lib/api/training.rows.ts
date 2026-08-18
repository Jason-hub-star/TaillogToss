/**
 * Shared training status row loader — avoids duplicate progress/feedback reads.
 * Parity: UI-001
 */
import { requestBackend } from './backend';
import { measureStartupAsync } from 'lib/performance/startupPerformance';
import { type BackendTrainingStatusRow } from './training.transform';

const inFlightRowsByDog = new Map<string, Promise<BackendTrainingStatusRow[]>>();

async function getTrainingRowsFromBackend(dogId: string): Promise<BackendTrainingStatusRow[]> {
  const rows = await requestBackend<BackendTrainingStatusRow[]>(`/api/v1/training/${dogId}`);
  return Array.isArray(rows) ? rows : [];
}

export function clearTrainingRowsCache(dogId?: string) {
  if (dogId) {
    inFlightRowsByDog.delete(dogId);
    return;
  }
  inFlightRowsByDog.clear();
}

export async function getSharedTrainingRows(
  dogId: string,
  source: 'progress' | 'feedback',
): Promise<BackendTrainingStatusRow[]> {
  const inFlight = inFlightRowsByDog.get(dogId);
  if (inFlight) {
    return inFlight;
  }

  const promise = measureStartupAsync(
    'api_training_rows_backend',
    { dogId, source },
    () => getTrainingRowsFromBackend(dogId),
  );

  inFlightRowsByDog.set(dogId, promise);
  try {
    return await promise;
  } finally {
    inFlightRowsByDog.delete(dogId);
  }
}
