import { Storage } from '@apps-in-toss/framework';
import type { SurveyData } from 'types/dog';

const PREFIX = 'completed_survey_';

function key(userId: string) {
  return `${PREFIX}${userId}`;
}

export async function saveCompletedSurvey(userId: string, data: SurveyData): Promise<void> {
  try {
    await Storage.setItem(key(userId), JSON.stringify({ data, savedAt: Date.now() }));
  } catch {
    // Result cache is a recovery aid only.
  }
}

export async function loadCompletedSurvey(userId: string): Promise<SurveyData | null> {
  try {
    const raw = await Storage.getItem(key(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { data?: SurveyData };
    return parsed.data ?? null;
  } catch {
    return null;
  }
}

export async function clearCompletedSurvey(userId: string): Promise<void> {
  try {
    await Storage.removeItem(key(userId));
  } catch {
    // Ignore cleanup failures.
  }
}
