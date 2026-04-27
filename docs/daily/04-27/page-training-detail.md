# /training/detail — 2026-04-27

Status: **Done**

## 작업 내역

- [x] `ProUpgradeSheet.tsx` 신규 — Pro 기능 접근 시 인터셉트 바텀시트 (혜택 4항목 + CTA)
- [x] `detail.tsx` "시도 이력 보기" `!isPro` 인터셉트 추가 → `ProUpgradeSheet` 노출
- [x] `ProUpgradeBanner.tsx` 토큰 하드코딩 수정 (`borderRadius: 16/12` → `spacing.lg/md`, `paddingVertical: 14` → `spacing.lg`)
- [x] tsc 0 errors 확인

## 연관 변경

- `coaching/result.tsx` — 잔여 Pro 넛지 제거 (`!isPro && remaining === 0` 블록 + dead styles)
- `privacy.tsx` — Supabase 위탁업체 명시 (보안 심사 대응)
- `mTLSClient.ts` — `sendSmartMessage` 필드명 Toss API 스펙 맞춤 (`templateSetCode` + `context` + `x-toss-user-key` 헤더)
