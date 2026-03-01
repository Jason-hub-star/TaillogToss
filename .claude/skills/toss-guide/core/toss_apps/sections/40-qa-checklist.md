Section-ID: toss_apps-40
Auto-Enrich: true
Last-Reviewed: 2026-03-01
Primary-Sources: developers-apps-in-toss.toss.im

## 11.5 접근성 체크리스트

| # | 항목 | 기준 | 구현 |
|---|------|------|------|
| 1 | **동적 텍스트** | iOS Large~xxxLarge, Android 연속 스케일 지원 | Typography 토큰 사용 (fontSize 하드코딩 금지) |
| 2 | **VoiceOver 라벨** | 모든 인터랙티브 요소에 `accessibilityLabel` | IconButton, Chip, 커스텀 터치 영역 |
| 3 | **VoiceOver 역할** | `accessibilityRole` 지정 | button, checkbox, tab, header, link |
| 4 | **최소 터치 영역** | 44×44pt 이상 | `hitSlop` 또는 패딩으로 보정 |
| 5 | **줄바꿈** | 음절(character) 단위 줄바꿈 | 한글 텍스트는 word-break 대신 character-break |

## 11.6 디자인 퀄리티 원칙 (토스 기준)

| 원칙 | 설명 | TaillogToss 적용 |
|------|------|-----------------|
| **Worst-case 먼저** | 모든 옵션 최대 사용 상태를 먼저 확인 | 긴 강아지이름, 8개 행동칩 전체 선택, 긴 코칭 텍스트 |
| **블러/투명도** | 오버레이에 blur 효과로 가벼운 시각 | BottomSheet dimmed 배경, ModalLayout |
| **애니메이션 일관성** | 진입 300ms ease-out, 퇴장 200ms ease-in | Accordion, BottomSheet, 화면 전환 |
| **스크롤 인디케이터** | 긴 목록에 스크롤 여부 시각 힌트 | Dashboard 기록 목록, 설정 목록 |
| **빈 상태 ≠ 에러** | EmptyState(안내+CTA) vs ErrorState(재시도) 명확 분리 | 기록 0건 vs 네트워크 에러 |
| **Skeleton 즉시 표시** | 데이터 로딩 시 2초 이내 Skeleton 또는 Loader | 모든 API 호출 화면 |

## 12. 심사 체크리스트 (공식 Review Requirements)

| 항목 | 요구사항 | 비고 |
|------|---------|------|
| 뒤로가기 | 모든 하위 화면에 ← 또는 × 필수 | 메인 탭/로그인 제외 |
| 응답 시간 | 모든 인터랙션 **2초 이내** 응답 | Loader/Skeleton 즉시 표시 |
| 라이트 모드 | **라이트 모드만** 지원 (다크 모드 미지원) | useColorScheme 불필요 |
| 번들 크기 | `.ait` 파일 압축 해제 후 **100MB** 이하 | 이미지/폰트 최적화 |
| 오디오 | 광고/결제 중 앱 오디오 일시 정지 | 해당 시 구현 |
| 인앱 기능 | 콘솔에 최소 **1개** 인앱 기능 등록 | 등록 안 하면 심사 거부 |
| UX Writing | [공식 가이드](https://developers-apps-in-toss.toss.im/design/ux-writing.html) 준수 | 릴리즈 전 점검 |
| Rate Limit | 공식 기본 **3,000 QPM** | 초과 시 429 응답 |

### CORS 허용 origin
- `https://apps-in-toss.toss.im` — 콘솔 테스트 버튼
- `https://{appName}.private-apps.tossmini.com` — Sandbox 테스트
- 프로덕션은 토스 앱 내부 WebView → CORS 불필요
