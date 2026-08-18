#!/usr/bin/env bash
# node_modules 패치 자동화 스크립트
# npm install 후 사라지는 shim 파일과 inline-plugin.js 패치를 복원한다.
# postinstall 훅에서 자동 실행됨.

set -euo pipefail
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NM="$REPO_ROOT/node_modules"

echo "[patch-node-modules] 패치 시작..."

# ─── 1. metro-transform-plugins inline-plugin.js 패치 ──────────────────────
# opts.platform 이 null 일 때 t.stringLiteral(null) 크래시 방지
INLINE="$NM/metro-transform-plugins/src/inline-plugin.js"
if grep -q "opts\.platform != null" "$INLINE"; then
  echo "[patch] inline-plugin.js — 이미 적용됨, 건너뜀"
else
  # MemberExpression: isPlatformNode 직전에 null 가드 추가
  sed -i '' \
    's/opts\.inlinePlatform &&\n\s*opts\.platform != null &&\n\s*isPlatformNode/opts.inlinePlatform \&\&\n          opts.platform != null \&\&\n          isPlatformNode/g' \
    "$INLINE" 2>/dev/null || true

  # python3으로 정확하게 패치 (sed 멀티라인 한계 우회)
  python3 - "$INLINE" <<'PYEOF'
import re, sys

path = sys.argv[1]
src = open(path).read()

# MemberExpression 블록: isPlatformNode 앞에 null 가드
src = re.sub(
    r'(opts\.inlinePlatform &&\s+)(isPlatformNode)',
    r'\1opts.platform != null &&\n            \2',
    src, count=1
)

# CallExpression 블록: isPlatformSelectNode 앞에 null 가드
src = re.sub(
    r'(opts\.inlinePlatform &&\s+)(isPlatformSelectNode)',
    r'\1opts.platform != null &&\n          \2',
    src, count=1
)

open(path, 'w').write(src)
print("[patch] inline-plugin.js — 패치 완료")
PYEOF
fi

# ─── 2. @granite-js/react-native App/index.tsx shim ──────────────────────
APP_INDEX="$NM/@granite-js/react-native/src/app/App/index.tsx"
if [ ! -f "$APP_INDEX" ]; then
  cat > "$APP_INDEX" <<'EOF'
import type { PropsWithChildren } from 'react';
import type { InitialProps } from '../../initial-props';

export type Props = PropsWithChildren<InitialProps>;
export { App } from './index.android';
EOF
  echo "[patch] @granite-js/react-native App/index.tsx — 생성"
else
  echo "[patch] @granite-js/react-native App/index.tsx — 이미 존재, 건너뜀"
fi

# ─── 3. @react-native-community/blur shims ────────────────────────────────
BLUR_DIR="$NM/@react-native-community/blur/src/components"

BLUR_VIEW="$BLUR_DIR/BlurView.tsx"
if [ ! -f "$BLUR_VIEW" ]; then
  cat > "$BLUR_VIEW" <<'EOF'
export { default } from './BlurView.android';
export type { BlurViewProps } from './BlurView.android';
EOF
  echo "[patch] blur BlurView.tsx — 생성"
else
  echo "[patch] blur BlurView.tsx — 이미 존재, 건너뜀"
fi

VIBRANCY="$BLUR_DIR/VibrancyView.tsx"
if [ ! -f "$VIBRANCY" ]; then
  cat > "$VIBRANCY" <<'EOF'
export { default } from './VibrancyView.android';
EOF
  echo "[patch] blur VibrancyView.tsx — 생성"
else
  echo "[patch] blur VibrancyView.tsx — 이미 존재, 건너뜀"
fi

# ─── 4. react-native ReactDevToolsSettingsManager shim ───────────────────
RDT_DIR="$NM/react-native/src/private/devsupport/rndevtools"
RDT_FILE="$RDT_DIR/ReactDevToolsSettingsManager.js"
if [ ! -f "$RDT_FILE" ]; then
  mkdir -p "$RDT_DIR"
  cat > "$RDT_FILE" <<'EOF'
export { setGlobalHookSettings, getGlobalHookSettings } from './ReactDevToolsSettingsManager.android';
EOF
  echo "[patch] ReactDevToolsSettingsManager.js — 생성"
else
  echo "[patch] ReactDevToolsSettingsManager.js — 이미 존재, 건너뜀"
fi

# ─── 5. @supabase/auth-js default localhost URL 제거 ─────────────────────
# TaillogToss는 createClient(SUPABASE_URL, ...)로 실제 URL을 항상 전달한다.
# 하지만 auth-js의 미사용 fallback 상수 http://localhost:9999가 AIT 번들에 남아
# release bundle security scan을 오염시키므로 non-local placeholder로 교체한다.
SUPABASE_AUTH_CONSTANT_FILES=(
  "$NM/@supabase/auth-js/src/lib/constants.ts"
  "$NM/@supabase/auth-js/dist/main/lib/constants.js"
  "$NM/@supabase/auth-js/dist/main/lib/constants.d.ts"
  "$NM/@supabase/auth-js/dist/module/lib/constants.js"
  "$NM/@supabase/auth-js/dist/module/lib/constants.d.ts"
)
python3 - "${SUPABASE_AUTH_CONSTANT_FILES[@]}" <<'PYEOF'
import sys

replacements = {
    "'http://localhost:9999'": "'https://supabase-auth-placeholder.invalid'",
    '"http://localhost:9999"': '"https://supabase-auth-placeholder.invalid"',
}
patched = 0
skipped = 0
missing = 0

for path in sys.argv[1:]:
    try:
        src = open(path, encoding='utf-8').read()
    except FileNotFoundError:
        missing += 1
        continue

    next_src = src
    for old, new in replacements.items():
        next_src = next_src.replace(old, new)

    if next_src != src:
        open(path, 'w', encoding='utf-8').write(next_src)
        patched += 1
    elif 'supabase-auth-placeholder.invalid' in src:
        skipped += 1
    else:
        print(f"[patch] @supabase/auth-js GOTRUE_URL — 예상 문자열 없음: {path}")

print(f"[patch] @supabase/auth-js GOTRUE_URL — localhost fallback 제거/확인 patched={patched} skipped={skipped} missing={missing}")
PYEOF

echo "[patch-node-modules] 모든 패치 완료 ✓"
