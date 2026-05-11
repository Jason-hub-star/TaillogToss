/**
 * Shared training status row loader — avoids duplicate progress/feedback reads.
 * Parity: UI-001
 */
import { supabase } from './supabase';
import { requestBackend, withBackendFallback } from './backend';
import { measureStartupAsync } from 'lib/performance/startupPerformance';
import {
  isMissingRelationError,
  type BackendTrainingStatusRow,
} from './training.transform';

const inFlightRowsByDog = new Map<string, Promise<BackendTrainingStatusRow[]>>();

async function getTrainingRowsFromSupabase(dogId: string): Promise<BackendTrainingStatusRow[]> {
  const { data, error } = await supabase
    .from('user_training_status')
    .select('*')
    .eq('dog_id', dogId)
    .order('created_at', { ascending: true });
  if (error) {
    if (isMissingRelationError(error)) return [];
    throw error;
  }
  return (data ?? []) as BackendTrainingStatusRow[];
}

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

  const promise = withBackendFallback(
    () =>
      measureStartupAsync(
        'api_training_rows_backend',
        { dogId, source },
        () => getTrainingRowsFromBackend(dogId),
      ),
    () =>
      measureStartupAsync(
        'api_training_rows_supabase',
        { dogId, source },
        () => getTrainingRowsFromSupabase(dogId),
      ),
  );

  inFlightRowsByDog.set(dogId, promise);
  try {
    return await promise;
  } finally {
    inFlightRowsByDog.delete(dogId);
  }
}
