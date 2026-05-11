# Page Dog Profile — Photo Picker Permission Loop

- Date: 2026-05-11
- Scope: APP-001, UIUX-006
- Routes: `/dog/profile`, `/onboarding/stage1-form`

## Checklist

- [x] `DogPhotoPicker` 권한 요청 중복 제거: `fetchAlbumPhotos.getPermission()`/`openPermissionDialog()` 사전 호출을 제거하고 SDK 래퍼의 단일 권한 요청 흐름으로 통일.
- [x] 사진 선택 취소/빈 결과를 실패 Alert로 처리하지 않도록 분리.
- [x] 권한 계열 오류와 실제 선택 실패 메시지를 분리.
- [x] 개발용 Sandbox host 권한 한계 대응: `NO_PERMISSION` 발생 시 `테스트 사진 사용` fallback 제공.
- [x] data URI 테스트 사진 업로드를 위해 `uploadDogProfileImage()` 파일 확장자/content-type 파싱 보강.
- [x] 개발모드 서버 확인: Metro `8081`, FastAPI `8765`, adb reverse `8081/8765/5173`.
- [x] Sandbox 앱 Metro 번들 로드 확인: `loadJSBundleFromMetro()`, `Running "shared"`, dashboard 렌더.
- [x] Sandbox `/dog/profile`에서 fallback Alert 확인: `개발용 사진 선택 제한`, `테스트 사진 사용`.

## Evidence

- `npm run typecheck` PASS
- `npx jest src/components/features/dog/DogPhotoPicker.test.tsx --runInBand` PASS (3 tests)
- Android package check: `viva.republica.toss.test`에는 `READ_MEDIA_*`/`READ_EXTERNAL_STORAGE` 사진 읽기 권한이 없고, 실제 `viva.republica.toss`에는 사진 읽기 권한이 선언되어 있음.

## Notes

- 개발용 Sandbox 앱에서는 host 앱 권한 한계 때문에 실제 갤러리 선택이 계속 실패할 수 있다.
- AIT/실 Toss 앱에서는 host 권한이 선언되어 있으므로, 이번 수정 후 업로드본에서 재검증한다.

## Historical Clarification

- 2026-03-02 `page-dog-profile`의 "사진 선택 및 업로드 파이프라인 작동 확인"은 파이프라인 구현/연결 확인으로 보고, 개발용 Sandbox에서 실제 앨범 선택이 성공했다는 증거는 없다.
- 2026-04-22 `page-dog-photo-dashboard`의 "진돗개 사진 대시보드 표시"는 이미 존재하는 `dogs.profile_image_url`/Storage URL을 `<Image>`로 표시한 성공이다.
- 2026-05-04 문서에서 이미 `viva.republica.toss.test` manifest에 `READ_MEDIA_*`/`READ_EXTERNAL_STORAGE`가 없어 `fetchAlbumPhotos`가 구조적으로 실패한다고 진단했다.
- 따라서 현재 운영 기준은 개발모드: 테스트 사진 fallback으로 저장/업로드 흐름 개발, 최종검증: 새 `.ait` 업로드 후 실제 Toss 앱에서 실제 사진 선택 확인이다.
