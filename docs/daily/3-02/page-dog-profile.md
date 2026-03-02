# `page-dog-profile-upgrade` (2026-03-02)

## Goal
- **Parity ID:** UIUX-006 (Dog Profile/Switcher Enrichment)
- **Target:** `/dog/profile`, `/dog/switcher`
- **Issue:** 반려견 아바타가 고정된 이모지로만 표시됨. 설문 및 프로필에서 사진 등록 기능 누락.

## Execution Plan
- [x] **타입 확장:** `SurveyStep1`에 `profile_image_url` 추가.
- [x] **사진 선택 UI 구현:** `DogPhotoPicker.tsx` 생성 및 온보딩/프로필 페이지 통합.
- [x] **사진 업로드 파이프라인:** `src/lib/api/dog.ts`에 Supabase Storage 업로드 로직(`uploadDogProfileImage`) 추가.
- [x] **범용 아바타 컴포넌트:** `DogAvatar.tsx` 생성 (사진 > 이모지 > 로티 폴백).
- [x] **프로필/스위처 연동:** 기존 이모지 영역을 실제 사진 아바타로 교체 및 저장 로직 보완.

## Status Check
- [x] 설문 Step 1에서 사진 선택 및 업로드 파이프라인 작동 확인.
- [x] 프로필 수정 페이지에서 기존 사진 로드 및 수정 기능 확인.
- [x] 반려견 스위처 목록에서 개별 반려견의 실제 사진 노출 확인.

---
*Self-Review: 단순 텍스트/이모지 중심의 프로필에서 실제 사진 중심의 개인화된 UX로 한 단계 도약함. Storage 업로드 시 에러 핸들링을 추가하여 안정성 확보.*
