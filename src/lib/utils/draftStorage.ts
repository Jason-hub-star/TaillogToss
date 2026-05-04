import AsyncStorage from '@granite-js/native/@react-native-async-storage/async-storage';

const PREFIX = 'survey_draft_';

function key(stageKey: string) {
  return `${PREFIX}${stageKey}`;
}

export async function saveDraft<T>(stageKey: string, data: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key(stageKey), JSON.stringify({ data, savedAt: Date.now() }));
  } catch {
    // draft 저장 실패는 UX에 영향 없음 — 조용히 무시
  }
}

export async function loadDraft<T>(stageKey: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key(stageKey));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { data: T };
    return parsed.data;
  } catch {
    return null;
  }
}

export async function clearDraft(stageKey: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key(stageKey));
  } catch {
    // 조용히 무시
  }
}

export async function clearAllDrafts(): Promise<void> {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const draftKeys = allKeys.filter((k) => k.startsWith(PREFIX));
    if (draftKeys.length > 0) await AsyncStorage.multiRemove(draftKeys);
  } catch {
    // 조용히 무시
  }
}
