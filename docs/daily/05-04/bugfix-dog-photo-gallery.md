# 2026-05-04 — DogPhotoPicker 버그 픽스 + 갤러리 테스트 환경 진단

## 작업 요약

### [x] DogPhotoPicker notDetermined 버그 픽스
- **파일**: `src/components/features/dog/DogPhotoPicker.tsx`
- **버그**: `fetchAlbumPhotos.getPermission()`이 `'notDetermined'` 반환 시 `openPermissionDialog()` 미호출 → 시스템 다이얼로그 없이 바로 "설정에서 허용해주세요" Alert
- **근거**: `@apps-in-toss/native-modules` 공식 JSDoc 대조 — `PermissionStatus = 'notDetermined' | 'denied' | 'allowed'`
- **픽스**: `if (permission === 'denied')` → `if (permission !== 'allowed')` (notDetermined 포함)

### [x] 갤러리 테스트 환경 한계 확인 (진단)
- `viva.republica.toss.test` 매니페스트: `READ_MEDIA_IMAGES` / `READ_EXTERNAL_STORAGE` 미선언
- `fetchAlbumPhotos` 내부적으로 Android MediaStore 사용 → `SecurityException` → "사진 선택 실패" Alert
- 사진은 Optional (non-fatal: `stage1-form.tsx:115` `if (profileImageUrl)` 체크)
- 실 Toss 앱 배포 시 정상 예상 (프로덕션 Toss 앱은 미디어 권한 선언)
- adb 우회: `pm grant CAMERA` → `granted=true` (임시)

## Board 상태

| 페이지 | 상태 |
|--------|------|
| `/onboarding/stage1-form` | Done (변경 없음) |
| `/dog/profile` | Done (변경 없음) |
