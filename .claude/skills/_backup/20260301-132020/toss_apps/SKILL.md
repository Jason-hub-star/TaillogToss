---
name: toss_apps
description: Toss 미니앱 개발 기초 — 프레임워크, TDS 컴포넌트, mTLS 보안, S2S API, Supabase 연동 패턴.
---

# Toss Apps Skill — 개발 기초

Toss 미니앱 개발에 필요한 프레임워크, TDS(Toss Design System), 보안, API, Supabase 연동을 다룬다.
화면 와이어프레임은 `/toss_wireframes`, 사용자 여정은 `/toss_journey`를 참조.

## 1. Service Overview & Process

Apps in Toss run within the Toss application, leveraging its massive traffic.

### Service Open Process
1.  **Agreement & Contract**: Sign partnership agreement with Toss.
2.  **Registration**: Register app in [Toss Developers Console](https://developers-apps-in-toss.toss.im/).
3.  **Development**: Choose Web (WebView), React Native, or Unity.
4.  **QA & Review**: Test in Sandbox app and request formal review.
5.  **Launch**: Once approved, the app is launched within Toss.

## 2. Development Frameworks & SDKs

### Implementations
- **Web (WebView)**: Uses `@apps-in-toss/web-framework`. Mandatory **TDS WebView** for non-game apps.
- **React Native**: Uses `@granite-js/react-native` as the runtime baseline (the `@apps-in-toss/react-native-framework` template can be used when scaffolding), with file-based routing.
- **Game Engine**: Unity/Cocos support via plugins.

### JavaScript SDK (`AppsInToss` object)
The `AppsInToss` SDK (likely available globally or via the framework) provides:
- **Routing**: Internal navigation and query parameter handling.
- **System Control**: Controlling the native back button behavior and app lifecycle.
- **Standard APIs**: Standard Web APIs (`window.open`, etc.) are generally supported within the WebView context.

### Design Tools
- **Toss AppBuilder (Deus)**: Build screens using TDS components. Supports branding and prototyping.
- **Figma**: Official component library for design consistency.

## 3. Toss Design System (TDS) — React Native 전체 컴포넌트 카탈로그

### Foundation

#### Colors (`@toss/tds-react-native` → `colors.*`)
Perceptually uniform color space. `import { colors } from '@toss/tds-react-native'`

| 카테고리 | 토큰 범위 | 용도 |
|----------|----------|------|
| Grey 50~900 | `#f9fafb` ~ `#191f28` | 중립 배경/텍스트 |
| Blue 50~900 | `#e8f3ff` ~ `#194aa6` | 프라이머리 액션 |
| Red 50~900 | `#ffeeee` ~ `#a51926` | 에러/경고 |
| Orange/Yellow/Green/Teal/Purple | 각 10단계 | 보조 색상 |
| Grey Opacity 50~900 | 반투명 | 오버레이/딤 |

**Semantic 토큰** (하드코딩 금지 — 반드시 토큰 사용):
- `background` → `#FFFFFF` (기본 배경)
- `greyBackground` → 중립 서피스
- `layeredBackground` → 오버레이 백
- `floatedBackground` → 플로팅 요소

**프로젝트 컬러 매핑** (현재 하드코딩 → 토큰 전환 대상):
| 현재 하드코딩 | TDS 토큰 대체 |
|--------------|--------------|
| `#0064FF` | `colors.blue500` (Primary CTA) |
| `#202632` | `colors.grey900` (텍스트 기본) |
| `#333D4B` | `colors.grey800` (텍스트 보조) |
| `#8B95A1` | `colors.grey500` (라벨/힌트) |
| `#E5E8EB` | `colors.grey200` (보더) |
| `#F4F4F5` | `colors.grey100` (디바이더) |
| `#F8F9FA` | `colors.grey50` (서브 배경) |

#### Typography (토큰 스케일 — 하드코딩 금지)
동적 접근성 스케일링을 위해 반드시 토큰 사용. `fontSize` 직접 입력 금지.

| 토큰 | 크기 | 행간 | 용도 |
|------|------|------|------|
| Typography 1 | 30px | 40px | 대형 헤딩 (survey-result 타이틀) |
| Typography 2 | 26px | 35px | 페이지 헤딩 (Top 컴포넌트) |
| Typography 3 | 22px | 31px | 섹션 헤딩 (ListHeader) |
| Typography 4 | 20px | 29px | 소형 헤딩 (카드 타이틀) |
| Typography 5 | 17px | 25.5px | 본문 기본 (ListRow 텍스트) |
| Typography 6 | 15px | 22.5px | 본문 소형 (보조 설명) |
| Typography 7 | 13px | 19.5px | 캡션/라벨 (Badge, 타임스탬프) |

**접근성 스케일링**: iOS Large~A11y_xxxLarge (100%~310%), Android 연속 스케일.
기저 토큰 F11~F42 (42단계) → 위 7개 Typography로 조합. 하드코딩 시 동적 스케일 불가.

### 3-1. UI 컨트롤 (13)
| 컴포넌트 | 용도 | 핵심 Props |
|----------|------|-----------|
| `Button` | 기본 CTA 버튼 | `size`, `variant("primary"│"secondary"│"outline")`, `loading` |
| `TextButton` | 텍스트형 버튼 (링크 스타일) | `size`, `color` |
| `IconButton` | 아이콘 단독 버튼 | `icon`, `size`, `accessibilityLabel` |
| `Checkbox` | 다중 선택 | `checked`, `onChange`, `label` |
| `Radio` | 단일 선택 | `value`, `selected`, `onChange` |
| `Switch` | 토글 on/off | `value`, `onValueChange` |
| `SegmentedControl` | 탭형 세그먼트 선택 | `segments[]`, `selectedIndex`, `onChange` |
| `Dropdown` | 드롭다운 선택기 | `options[]`, `value`, `onChange` |
| `TextField` | 텍스트 입력 | `label`, `value`, `placeholder`, `error`, `maxLength` |
| `SearchField` | 검색 전용 입력 | `value`, `onSearch`, `placeholder` |
| `NumericSpinner` | 숫자 증감 입력 | `value`, `min`, `max`, `step` |
| `Stepper` | 단계 증감 (±) | `value`, `min`, `max`, `onValueChange` |
| `Slider` | 범위 슬라이더 | `value`, `min`, `max`, `onValueChange` |

### 3-2. 네비게이션 / 레이아웃 (12)
| 컴포넌트 | 용도 | 핵심 Props / 서브컴포넌트 |
|----------|------|--------------------------|
| `Navbar` | 상단 네비게이션 바 | `.BackButton`, `.CloseButton`, `.TextButton`, `.Title` |
| `Tab` | 탭 네비게이션 | `tabs[]`, `selectedIndex`, `onChange` |
| `List` | 목록 컨테이너 | children: `ListRow[]` |
| `ListRow` | 목록 행 | `.Texts`(title, subtitle), `.RightTexts`, `.Icon`, `.Image` |
| `ListHeader` | 목록 섹션 헤더 | `title`, `description` |
| `ListFooter` | 목록 하단 정보 | `text` |
| `GridList` | 그리드형 목록 | `columns`, `gap`, children |
| `Carousel` | 가로 슬라이드 | `gap`, `snapToInterval`, children |
| `BoardRow` | 보드형 카드 행 | `title`, `description`, `image` |
| `TableRow` | 테이블 행 (key-value) | `label`, `value` |
| `Top` | 화면 최상단 영역 | `title`, `subtitle`, children |
| `BottomCTA` | 하단 고정 CTA 버튼 | children: `Button` |

### 3-3. 피드백 / 정보 (12)
| 컴포넌트 | 용도 | 핵심 Props |
|----------|------|-----------|
| `Badge` | 상태 뱃지 | `variant("info"│"success"│"warning"│"danger")`, `text` |
| `Toast` | 토스트 알림 | `message`, `duration`, `action` |
| `Dialog` | 대화상자 | `title`, `description`, `primaryButton`, `secondaryButton` |
| `Loader` | 로딩 인디케이터 | `size`, `color` |
| `Skeleton` | 로딩 플레이스홀더 | pattern: `topList`, `cardOnly`, `listOnly` |
| `ProgressBar` | 진행률 바 | `value(0-1)`, `color` |
| `Result` | 결과/완료 화면 | `icon`, `title`, `description`, children |
| `ErrorPage` | 에러 전체 화면 | `title`, `description`, `retryButton` |
| `BottomInfo` | 하단 부가 정보 | `text`, `icon` |
| `Post` | 게시글/콘텐츠 뷰 | `title`, `body`, `author`, `date` |
| `Rating` | 별점 표시/입력 | `value`, `max`, `onChange` |
| `Keypad` | 커스텀 키패드 | variant: `Alphabet`, `Secure`, `Number` |

### 3-4. 오버레이 / 훅 (4)
| 훅 | 용도 | 반환 |
|----|------|------|
| `useDialog` | 프로그래밍 방식 Dialog 표시 | `{ open(options), close() }` |
| `useToast` | 프로그래밍 방식 Toast 표시 | `{ show(message, options) }` |
| `useBottomSheet` | 바텀시트 표시/제어 | `{ open(content, options), close() }` |
| `useOverlay` | 범용 오버레이 관리 | `{ open(component), close() }` |

### 3-5. 시각 요소 (6)
| 컴포넌트 | 용도 |
|----------|------|
| `Border` | 구분선/테두리 데코레이터 |
| `Shadow` | 그림자 효과 래퍼 |
| `Gradient` | 그래디언트 배경 |
| `Highlight` | 강조 텍스트 래퍼 |
| `Asset` | 아이콘/이미지/비디오/Lottie 통합 미디어 |
| `AmountTop` | 금액 강조 상단 영역 |

### 3-6. 데이터 시각화 (1)
| 컴포넌트 | 용도 | 핵심 Props |
|----------|------|-----------|
| `BarChart` | 막대 차트 | `data[]`, `xKey`, `yKey`, `color` |

### 시스템 훅
- `useVisualViewport`: 키보드 등에 의한 뷰포트 변화 감지

## 4. Backend & Security (mTLS)

- **Requirement**: All S2S communication **must** use mTLS.
- **Certificates**: Issued via the Developers Console.
- **Network**: Allow Toss Inbound/Outbound IP ranges in your firewall.
- **Repo Path Contract**: This project keeps backend code in-repo at `Backend/app/...` and migrations at `Backend/alembic/...`, while Toss bridge functions stay in `supabase/functions/...`.

## 5. S2S API & Authentication

### Toss Login (OAuth2)
- **Profile Endpoint**: `GET /api-partner/v1/apps-in-toss/user/oauth2/login-me`
- **Authorization**: `Bearer {AccessToken}`
- **Note**: User profile fields may be null based on consent.

### Core Features
- **In-App Payment (IAP)**: Consumable/Non-consumable. Refunds follow OS policies.
- **Smart Message**: Push (OS) and Notification (Bell). Titles max 13 chars, body max 20 chars.
- **Promotion**: Toss Points integration via S2S APIs.
- **Game Center**: Global leaderboards and player profiles.

## 6. AI & LLM Integration

### MCP Server Support
Apps in Toss provides an **MCP (Model Context Protocol)** server for Cursor and Claude Code.
- **Benefits**: AI refers to SDK docs directly, detects API errors, and generates accurate code.

### Search & Installation
- **docs-search**: Semantic search based on the comprehensive `llms-full.txt` index.
- **Codex**: Install via `$skill-installer` using repo `toss/apps-in-toss-skills`.
- **Claude Code**: Install from marketplace.

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
```tsx
// components/Chip.tsx — TouchableOpacity + Badge 래퍼
import { TouchableOpacity } from 'react-native';
import { Badge } from '@toss/tds';

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress: () => void;
}

export function Chip({ label, selected, onPress }: ChipProps) {
  return (
    <TouchableOpacity onPress={onPress}>
      <Badge
        text={label}
        variant={selected ? 'info' : 'default'}
      />
    </TouchableOpacity>
  );
}
```

### Accordion 구현 패턴
```tsx
// components/Accordion.tsx — Animated.View height 보간
import { Animated, LayoutAnimation } from 'react-native';

export function useAccordion(initialExpanded = false) {
  const [expanded, setExpanded] = useState(initialExpanded);
  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
  };
  return { expanded, toggle };
}
```

## 7.6 차트 전략 — TDS BarChart + WebView 하이브리드

### 제약 사항
- **Victory Native 사용 불가**: `react-native-svg`, `react-native-reanimated` 등 네이티브 모듈 링킹 불가 (토스 미니앱 샌드박스 런타임)
- TDS에는 `BarChart` 1개만 존재 (Section 3-6 참조)

### 하이브리드 전략
| 차트 유형 | 구현 방식 | 사용 화면 |
|----------|----------|----------|
| 막대 차트 (행동 빈도) | TDS `BarChart` | analysis |
| Radar 차트 (원인 분석 5차원) | WebView + Chart.js | analysis |
| Heatmap (요일×시간 밀도) | WebView + Chart.js | analysis |
| Line 차트 (트렌드) | WebView + Chart.js | analysis (향후) |

### ChartWebView 재사용 컴포넌트
```tsx
// lib/charts/ChartWebView.tsx
import WebView from '@granite-js/native/react-native-webview';
import { useColorScheme } from '@toss/tds';

interface ChartWebViewProps {
  type: 'radar' | 'heatmap' | 'line';
  data: unknown;
  height?: number;
}

export function ChartWebView({ type, data, height = 250 }: ChartWebViewProps) {
  const colorScheme = useColorScheme();
  // TDS 색상 토큰에 맞춰 Chart.js 테마 자동 적용
  const html = generateChartHTML(type, data, colorScheme);
  return <WebView source={{ html }} style={{ height }} />;
}
```

### 색상 토큰 매칭
- WebView 내 Chart.js 차트는 TDS Colors v5 토큰을 CSS 변수로 주입
- 다크/라이트 모드 자동 대응: `useColorScheme()` → Chart.js 테마 전환

## 7.7 토스 Ads SDK 2.0 — 보상형 광고

### 지원 광고 유형
| 유형 | 지원 | 용도 |
|------|------|------|
| Interstitial (전면) | ✓ | 미사용 (UX 방해) |
| **Rewarded (보상형)** | ✓ | R1/R2/R3 터치포인트 |
| Banner (배너) | ✓ | 미사용 (v1) |

### 제약 사항
- `react-native-google-mobile-ads` 직접 사용 **불가** → 토스 통합 SDK 필수
- 토스 광고 우선 노출. AdMob 폴백은 토스 SDK 공식 지원 범위에서만 허용 (미지원 시 무광고 폴백)
- 테스트 ID: `ait-ad-test-rewarded-id`

### 보상형 광고 터치포인트 (3개)
| ID | 화면 | CTA 텍스트 | 보상 |
|----|------|-----------|------|
| R1 | survey-result | "광고 보고 전체 분석 보기" | 상세 리포트 1회 해제 |
| R2 | dashboard | "광고 보고 코칭 열기" | 오늘의 코칭 1회 열기 |
| R3 | coaching-result | "광고 보고 오늘의 코칭 열기" | 잠긴 3블록(④⑤⑥) 1회 해제 |

### 전환 심리
Skeleton 블러 → TextButton("광고 보고 열기") → Rewarded 시청 → 1회 해제 → "매번 광고 귀찮다 → PRO 구독" 자연 전환

## 8. Toss + Supabase Integration Pattern

### End-to-End Login Flow
Follow this runtime path:
1. Client calls `appLogin()` from `@apps-in-toss/framework`.
2. Client sends `{ authorizationCode, referrer }` to Supabase Edge Function (`login-with-toss`).
3. Edge Function calls Toss OAuth endpoints with mTLS:
   - `POST /api-partner/v1/apps-in-toss/user/oauth2/generate-token`
   - `GET /api-partner/v1/apps-in-toss/user/oauth2/login-me`
4. Edge Function maps Toss `userKey` to Supabase Auth account.
5. Edge Function returns Supabase session tokens.
6. Client runs `supabase.auth.setSession()` and continues onboarding.

### Client Baseline
- Env: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- Init:
```ts
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL!, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!);
```
- Login bridge:
```ts
const { data } = await supabase.functions.invoke('login-with-toss', {
  body: { authorizationCode, referrer },
});
await supabase.auth.setSession({
  access_token: data.access_token,
  refresh_token: data.refresh_token,
});
```

### Edge Function Baseline
Use server secrets only:
- `SUPER_SECRET_PEPPER`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `TOSS_CLIENT_CERT_BASE64`
- `TOSS_CLIENT_KEY_BASE64`

Function requirements:
1. Decode cert/key base64 and create `Deno.createHttpClient({ cert, key })`.
2. Call Toss OAuth APIs using `client: tossHttpClient`.
3. Derive deterministic password from `tossUserKey + pepper` (PBKDF2).
4. Sign in existing auth user, otherwise create user and insert `public.users`.
5. Return session payload (`access_token`, `refresh_token`).
- Path note: Edge Functions live under `supabase/functions/...`; FastAPI server code lives under `Backend/app/...` in this repository.

### Supabase Config
Example `supabase/config.toml`:
```toml
[functions.login-with-toss]
enabled = true
verify_jwt = true
import_map = "./functions/login-with-toss/deno.json"
entrypoint = "./functions/login-with-toss/index.ts"
```

If pre-login invoke gets 401, use `verify_jwt = false` for this endpoint or ensure JWT exists before invoke.

### DB Contract
Use UUID identity linked to `auth.users`:
```sql
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  toss_user_key TEXT UNIQUE NOT NULL,
  role TEXT DEFAULT 'user' NOT NULL CHECK (role IN ('user', 'trainer', 'org_owner', 'org_staff'))
);
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow individual read access" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Allow individual update access" ON public.users FOR UPDATE USING (auth.uid() = id);
```

Never mix integer `users.id` schema with Supabase Auth UUID schema.

## 9. 콘솔 등록 & 운영 API (공식 문서 기반)

### 9.1 콘솔 앱 등록 프로세스
1. 콘솔 가입 (토스 비즈니스 회원, 만 19세 이상)
2. 워크스페이스 생성 → 앱 등록 (개발 전에도 등록 가능)
3. 사업자 정보 등록 (토스 로그인, IAP 등 수익화 기능 사용 시 필수)
4. 토스 로그인 설정: 약관 URL + 동의문 URL + 연결 끊기 콜백 등록
5. mTLS 인증서 발급 (콘솔에서 발급, 만료 전 무중단 교체 = 2장 병행 등록)

### 9.2 약관 등록 — 자동 동의 화면
- 콘솔에 **약관 URL 등록** → 토스 앱이 OAuth 시 **WebView로 자동 노출**
- 개발자가 약관 동의 UI를 별도로 구현할 필요 없음
- 첫 로그인 시에만 동의 요청, 이후 세션 유지
- `agreedTerms` 배열로 사용자가 동의한 약관 목록 반환

| 콘솔 필드 | 필수 | 형식 |
|-----------|------|------|
| 서비스 이용약관 | ★필수 | 외부 웹 URL (토스가 WebView로 열음) |
| 개인정보 수집·이용 동의 | 선택 | 외부 웹 URL |
| 마케팅 정보 수신 동의 | 선택 | 외부 웹 URL |
| 전자적 전송매체 광고 수신 동의 | 선택 | 외부 웹 URL |

### 9.3 연결 끊기 콜백 (Disconnect Callback)
토스 → 파트너 서버 방향. **Basic Auth** 인증 (mTLS 아님).

```
POST {콜백URL}
Headers: Authorization: Basic {base64(id:password)}
Content-Type: application/json
Body: {"userKey": 443731103, "referrer": "UNLINK"}
Response: 200 OK
```

| referrer | 의미 | 처리 |
|----------|------|------|
| `UNLINK` | 사용자가 직접 연결 해제 | toss_user_key → NULL, 재연결 가능 |
| `WITHDRAWAL_TERMS` | 동의 철회 | PII 삭제 + 익명화 |
| `WITHDRAWAL_TOSS` | 토스 계정 탈퇴 | 전체 CASCADE 삭제 |

- GET/POST 모두 지원 (콘솔에서 선택)
- CORS: `https://apps-in-toss.toss.im` 허용 (콘솔 테스트 버튼용)
- 콘솔 테스트 시 userKey=0, referrer="UNLINK" 전송
- Basic Auth ID/PW: 콘솔 + 서버 secrets에 동일 값 설정

### 9.4 S2S API 엔드포인트 (공식 확인)

모든 S2S 호출은 mTLS 클라이언트 인증서 필요.

| API | Method | Path |
|-----|--------|------|
| 토큰 발급 | POST | `/api-partner/v1/apps-in-toss/user/oauth2/generate-token` |
| 프로필 조회 | GET | `/api-partner/v1/apps-in-toss/user/oauth2/login-me` |
| 토큰 갱신 | POST | `/api-partner/v1/apps-in-toss/user/oauth2/refresh-token` |
| 연결해제(토큰) | POST | `.../access/remove-by-access-token` |
| 연결해제(키) | POST | `.../access/remove-by-user-key` |

- Authorization Code 유효기간: **10분**
- AccessToken 유효기간: **1시간** (3600초)
- RefreshToken 유효기간: **14일**
- `scope`: 동의된 권한 (예: `user_ci`, `user_name`, `user_phone`)

### 9.5 PII 복호화 (AES-256-GCM)
Toss가 반환하는 사용자 정보는 **AES-256-GCM 암호화** 상태.

- **복호화 키 + AAD**: 콘솔에서 이메일로 별도 제공
- **IV**: 12바이트 (암호문 앞 12바이트)
- **AAD**: Additional Authenticated Data (콘솔 제공)

| 필드 | 암호화 | 비고 |
|------|--------|------|
| userKey | ✗ | 숫자, 고유 식별자 |
| name | ✓ | 동의 시만 반환 |
| phone | ✓ | 동의 시만 반환 |
| birthday | ✓ | yyyyMMdd |
| ci | ✓ | 본인확인정보 |
| gender | ✓ | |
| nationality | ✓ | |
| email | ✓ | 미인증 상태일 수 있음 |
| scope | ✗ | 동의된 권한 배열 |
| agreedTerms | ✗ | 동의한 약관 배열 |

```typescript
// 복호화 예시 (Deno Edge Function)
function decryptTossPII(encryptedBase64: string, keyHex: string, aad: Uint8Array): string {
  const encrypted = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));
  const iv = encrypted.slice(0, 12);
  const ciphertext = encrypted.slice(12);
  // AES-256-GCM decrypt with iv + aad
}
```

### 9.6 mTLS 인증서 배포
- 인증서: 콘솔에서 발급, PEM 형식 (cert + private key)
- **Supabase secrets로 등록**:
  - `TOSS_CLIENT_CERT_BASE64` = `base64(taillog_public.crt)`
  - `TOSS_CLIENT_KEY_BASE64` = `base64(taillog_private.key)`
- Edge Function에서 사용:
```typescript
const cert = atob(Deno.env.get('TOSS_CLIENT_CERT_BASE64')!);
const key = atob(Deno.env.get('TOSS_CLIENT_KEY_BASE64')!);
const httpClient = Deno.createHttpClient({ certChain: cert, privateKey: key });
```
- **⚠️ 인증서 파일은 git 저장소에 포함하지 않음** (`.gitignore`)
- 만료 전 교체: 새 인증서 발급 → secrets 업데이트 → 기존 인증서 7일 유예 후 삭제

## 10. Ads SDK 2.0 ver2 — 공식 인터페이스 (2026-02 확인)

### 공식 함수 시그니처
```typescript
// 기존 v1: loadRewardedAd / showRewardedAd → 폐기
// 공식 ver2: loadFullScreenAd / showFullScreenAd + adGroupId + destroy
interface TossAdsSdk {
  loadFullScreenAd(options: { adGroupId: string }): Promise<void>;
  showFullScreenAd(): Promise<{ rewarded: boolean }>;
  isAdLoaded(): boolean;
  destroy(): void;  // cleanup — useEffect return에서 호출
}
```

- `adGroupId`: 콘솔에서 발급받는 광고 그룹 ID (기존 unitId 대체)
- `destroy()`: 광고 리소스 정리 — 컴포넌트 언마운트 시 필수 호출
- 테스트 adGroupId: `ait-ad-test-rewarded-id`

## 11. IAP SDK — 공식 결제 패턴 (2026-02 확인)

### createOneTimePurchaseOrder (일회성 구매)
```typescript
import { createOneTimePurchaseOrder } from '@apps-in-toss/framework';

const cleanup = createOneTimePurchaseOrder({
  options: { sku: 'pro_monthly' },
  processProductGrant: async (receipt) => {
    // Edge Function으로 서버 검증 + 상품 지급
    const result = await supabase.functions.invoke('verify-iap-order', {
      body: { orderId: receipt.orderId, productId: receipt.productId,
              transactionId: receipt.transactionId }
    });
    return result.data?.ok === true;  // true=완료, false=환불 트리거
  },
  onEvent: (event) => { /* PURCHASE_STARTED, PAYMENT_COMPLETED, GRANT_COMPLETED */ },
  onError: (error) => { /* 결제 에러 UI */ },
});
// cleanup() — 결제 프로세스 취소/정리
```

### 미완료 주문 복구 (앱 시작 시)
```typescript
import { getPendingOrders, completeProductGrant } from '@apps-in-toss/framework';

const pending = await getPendingOrders();
for (const order of pending) {
  await completeProductGrant(order.orderId);
}
```

### SUBSCRIPTION 상품 유형
- 토스 IAP가 **SUBSCRIPTION** 타입 공식 지원 (2026년~)
- PRO 월간을 `ONE_TIME` 반복 대신 `SUBSCRIPTION`으로 등록 가능
- 자동 갱신, 해지, 유예 기간 등 토스가 관리

### 주의
- `@apps-in-toss/framework` 패키지가 `@granite-js/react-native`에 포함인지 별도 설치인지 확인 필요
- 현재 프로젝트 package.json에 미포함 — 확인 전까지 Edge Function 직통 방식 유지

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
