import { useEffect, useRef, useState, useCallback } from 'react';
import * as draftStorage from 'lib/utils/draftStorage';

interface Options<T> {
  stageKey: string;
  data: T;
  debounceMs?: number;
}

interface Return<T> {
  loadedDraft: T | null;
  isDraftLoading: boolean;
  clearDraft: () => Promise<void>;
}

export function useDraftSave<T>({ stageKey, data, debounceMs = 500 }: Options<T>): Return<T> {
  const [loadedDraft, setLoadedDraft] = useState<T | null>(null);
  const [isDraftLoading, setIsDraftLoading] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRestoredRef = useRef(false);

  // 마운트 시 1회 복원
  useEffect(() => {
    let cancelled = false;
    setIsDraftLoading(true);
    draftStorage.loadDraft<T>(stageKey).then((draft) => {
      if (!cancelled) {
        setLoadedDraft(draft);
        setIsDraftLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [stageKey]);

  // 복원 완료 후부터 debounce 저장
  useEffect(() => {
    if (isDraftLoading) return;
    if (!isRestoredRef.current) {
      // 첫 번째 렌더(복원 직후)는 저장 건너뜀
      isRestoredRef.current = true;
      return;
    }

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      void draftStorage.saveDraft(stageKey, data);
    }, debounceMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [data, stageKey, debounceMs, isDraftLoading]);

  const clearDraft = useCallback(() => draftStorage.clearDraft(stageKey), [stageKey]);

  return { loadedDraft, isDraftLoading, clearDraft };
}
