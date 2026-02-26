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
- **Colors (v5)**: Perceptually uniform color space. Uses hierarchy tokens for dark/light mode consistency.
- **Typography**: Dynamic sizing and line height tokens (accessibility-friendly).

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
