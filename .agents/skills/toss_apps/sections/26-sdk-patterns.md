Section-ID: toss_apps-26
Auto-Enrich: false
Last-Reviewed: 2026-03-01
Primary-Sources: developers-apps-in-toss.toss.im,supabase.com/docs


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

