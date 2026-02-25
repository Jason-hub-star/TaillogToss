---
name: toss_apps
description: Comprehensive guide for developing and integrating "Apps in Toss" (Mini-apps within the Toss app).
---

# Toss Apps Skill

This skill provides comprehensive knowledge for developing, integrating, and launching "Apps in Toss" (Mini-apps). It covers frameworks, Toss Design System (TDS), security (mTLS), S2S APIs, and AI integration.

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
- **React Native**: Uses `@apps-in-toss/react-native-framework` with file-based routing.
- **Game Engine**: Unity/Cocos support via plugins.

### JavaScript SDK (`AppsInToss` object)
The `AppsInToss` SDK (likely available globally or via the framework) provides:
- **Routing**: Internal navigation and query parameter handling.
- **System Control**: Controlling the native back button behavior and app lifecycle.
- **Standard APIs**: Standard Web APIs (`window.open`, etc.) are generally supported within the WebView context.

### Design Tools
- **Toss AppBuilder (Deus)**: Build screens using TDS components. Supports branding and prototyping.
- **Figma**: Official component library for design consistency.

## 3. Toss Design System (TDS)

### Foundation
- **Colors (v5)**: Perceptually uniform color space. Uses hierarchy tokens for dark/light mode consistency.
- **Typography**: Dynamic sizing and line height tokens (accessibility-friendly).

### Key Components
- **Layout**: `Top`, `BottomCTA`, `Bottom Info`, `ListHeader`, `ListRow`, `Board Row`.
- **Input**: `TextField`, `SplitTextField`, `TextArea`, `Checkbox`, `Switch`, `Keypad` (Alphabet, Secure, Number).
- **Feedback**: `Skeleton` (patterns: `topList`, `cardOnly`), `Badge`, `Bubble`, `Overlays`.
- **Media**: `Asset` (Icons, Images, Videos, Lottie).

### Utilities & Hooks
- **Overlay Extension**: `useDialog`, `useToast`, `useBottomSheet`.
- **System**: `useVisualViewport` for viewport management.

## 4. Backend & Security (mTLS)

- **Requirement**: All S2S communication **must** use mTLS.
- **Certificates**: Issued via the Developers Console.
- **Network**: Allow Toss Inbound/Outbound IP ranges in your firewall.

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
- **Sandbox App**: Mandatory for local/TDS testing.
- **QR Test**: Use `intoss-private://` scheme for private bundle testing.
- **UX Writing**: Review mandatory [UX Writing Guide](https://developers-apps-in-toss.toss.im/design/ux-writing.html) to pass inspection.

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
  role TEXT DEFAULT 'user' NOT NULL CHECK (role IN ('user', 'trainer', 'admin'))
);
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow individual read access" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Allow individual update access" ON public.users FOR UPDATE USING (auth.uid() = id);
```

Never mix integer `users.id` schema with Supabase Auth UUID schema.
