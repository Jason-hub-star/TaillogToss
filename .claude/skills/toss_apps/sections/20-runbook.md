Section-ID: toss_apps-20
Auto-Enrich: true
Last-Reviewed: 2026-03-01
Primary-Sources: developers-apps-in-toss.toss.im

## 7. Testing & Launch Checklist

### 단계 1: 로컬 개발 (일상 개발 기본)
- `npm run dev`로 로컬 개발 서버 실행
- iOS Simulator / Android Emulator에서 토스 샌드박스 앱으로 로컬 검수
- Android 에뮬레이터 연결: `adb reverse tcp:8081 tcp:8081` + `adb reverse tcp:5173 tcp:5173`
- 샌드박스 앱에서는 문서 표기(`Bedrock 열기`) 기준으로 개발 서버 진입
- Hot Reload 중심으로 UI/상태/라우팅 검수
- 참고: 일상 개발은 폰 연결 없이 가능하지만, 토스 인증/일부 시나리오는 실기기 확인이 필요할 수 있음

### 단계 2: 코드 레벨 테스트 (자동화)
- FE 단위: Jest + React Native Testing Library
- BE 단위: pytest
- 통합: Toss Auth mock, IAP 시뮬레이션, Edge Function contract test
- IAP 통합 테스트에 `verify-iap-order` 실패 복구 케이스 포함

### 단계 3: Sandbox/실기기 테스트 (출시 전 필수)
- 토스 Sandbox 앱 실기기 테스트 최소 1회 완료 후 심사 요청
- `.ait` 번들 업로드 + QR 테스트로 실환경 플로우 확인
- IAP 필수 3시나리오: 구매 성공 / 결제 성공 후 서버 지급 실패 복구 / 에러 처리
- 광고는 Sandbox 앱에서 테스트 불가. 토스 앱 QR 테스트로 별도 검증
- `intoss-private://` 스킴 기반 사설 번들 테스트 활용
- 릴리즈 전 UX Writing 가이드 필수 점검: [UX Writing Guide](https://developers-apps-in-toss.toss.im/design/ux-writing.html)

### UX 라이팅 5원칙 (심사 필수)

| # | 원칙 | ❌ 안 됨 | ✅ 올바름 |
|---|------|---------|----------|
| 1 | **해요체 통일** | "입력하세요", "~합니다" | "입력해주세요", "~해요" |
| 2 | **능동적 말하기** | "저장됐어요", "등록되었어요" | "저장했어요", "등록했어요" |
| 3 | **긍정적 말하기** | "기록이 없어요" | "첫 기록을 남겨보세요" |
| 4 | **캐주얼 경어** | "확인하시겠어요?", "계시다" | "확인할까요?", "있다" |
| 5 | **명사+명사 피하기** | "결제 정보 입력 완료" | "결제 정보를 입력했어요" |

**예외 허용**: 서비스 종료/기간 만료, 사용자 영향 설명, 안심 문구에서는 수동형("~돼요") 허용.
"되어요" → 모두 **"돼요"** 로 통일.

**TaillogToss 주요 점검 문구**:
- Toast: "~에 실패했어요. 다시 시도해주세요" (긍정형 전환 검토)
- EmptyState: "아직 기록이 없어요" → "첫 기록을 남겨보세요"
- Dialog 확인 버튼: "확인" / "취소" (간결체 유지)
- BottomCTA: 동사형 ("기록하기", "시작하기", "저장하기")

## 7.5 TDS 컴포넌트 갭 및 대안

토스 미니앱 샌드박스 런타임에서 네이티브 모듈 링킹이 불가능하므로, TDS에 없는 UI 패턴은 아래 대안으로 구현한다.

| 누락 패턴 | 대안 구현 | 비고 |
|-----------|----------|------|
| Chip/Tag (인터랙티브) | `TouchableOpacity` + `Badge` 래퍼 | quick-log 행동 칩 8개 |
| Accordion/Collapsible | `Animated.View` height 보간 커스텀 | quick-log 상세탭, dog-profile |
| DatePicker/TimePicker | `SegmentedControl` + `Dropdown` + `NumericSpinner` 조합 | 네이티브 모듈 제한으로 서드파티 불가 |
| Radar/Heatmap 차트 | `WebView`(`@granite-js/native/react-native-webview`) + Chart.js | analysis 화면 |
| Speech Bubble (말풍선) | `View` + `Shadow` + `Border`(radius) 커스텀 | coaching-result dog_voice |

### Chip 구현 패턴
