/**
 * 광고 동시로드 조정 — AIT 2026-07-10 대응.
 * Android에서 배너와 전면/보상형 광고를 동시 로드하면 이벤트 전달이 실패한다
 * (토스 슈퍼앱 SDK v5.268.0 이전). 전면/보상형이 로드·표시 중인 동안 배너
 * 렌더를 억제해 "순차 로드"를 보장한다.
 *
 * ponytail: 화면당 전면/보상형은 최대 1개, SDK 싱글턴이 last-load-wins 라 boolean 으로 충분.
 * 여러 전면을 동시 표시하게 되면 ref-count 로 승급.
 * Parity: AD-001
 */
import { useEffect, useState } from 'react';

let fullscreenAdActive = false;
const listeners = new Set<() => void>();

export function setFullscreenAdActive(active: boolean): void {
  if (fullscreenAdActive === active) return;
  fullscreenAdActive = active;
  for (const listener of listeners) listener();
}

export function isFullscreenAdActive(): boolean {
  return fullscreenAdActive;
}

/** 전면/보상형 광고가 로드·표시 중이면 true — 배너 억제용 */
export function useFullscreenAdActive(): boolean {
  const [active, setActive] = useState(fullscreenAdActive);
  useEffect(() => {
    const listener = () => setActive(fullscreenAdActive);
    listeners.add(listener);
    listener(); // 구독 시점 최신값 동기화
    return () => {
      listeners.delete(listener);
    };
  }, []);
  return active;
}
