import { Storage } from '@apps-in-toss/framework';

const PREFIX = 'survey_draft_';
const INDEX_KEY = `${PREFIX}index`;

function key(stageKey: string) {
  return `${PREFIX}${stageKey}`;
}

async function loadDraftKeys(): Promise<string[]> {
  const raw = await Storage.getItem(INDEX_KEY);
  if (!raw) return [];
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === 'string') : [];
}

async function rememberDraftKey(draftKey: string): Promise<void> {
  const keys = await loadDraftKeys();
  if (!keys.includes(draftKey)) {
    await Storage.setItem(INDEX_KEY, JSON.stringify([...keys, draftKey]));
  }
}

async function forgetDraftKey(draftKey: string): Promise<void> {
  const keys = await loadDraftKeys();
  const nextKeys = keys.filter((value) => value !== draftKey);
  if (nextKeys.length === 0) {
    await Storage.removeItem(INDEX_KEY);
    return;
  }
  await Storage.setItem(INDEX_KEY, JSON.stringify(nextKeys));
}

export async function saveDraft<T>(stageKey: string, data: T): Promise<void> {
  try {
    const draftKey = key(stageKey);
    await Storage.setItem(draftKey, JSON.stringify({ data, savedAt: Date.now() }));
    await rememberDraftKey(draftKey);
  } catch {
    // draft 저장 실패는 UX에 영향 없음 — 조용히 무시
  }
}

export async function loadDraft<T>(stageKey: string): Promise<T | null> {
  try {
    const raw = await Storage.getItem(key(stageKey));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { data: T };
    return parsed.data;
  } catch {
    return null;
  }
}

export async function clearDraft(stageKey: string): Promise<void> {
  try {
    const draftKey = key(stageKey);
    await Storage.removeItem(draftKey);
    await forgetDraftKey(draftKey);
  } catch {
    // 조용히 무시
  }
}

export async function clearAllDrafts(): Promise<void> {
  try {
    const draftKeys = await loadDraftKeys();
    await Promise.all(draftKeys.map((draftKey) => Storage.removeItem(draftKey)));
    await Storage.removeItem(INDEX_KEY);
  } catch {
    // 조용히 무시
  }
}
