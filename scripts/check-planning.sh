#!/usr/bin/env bash
set -euo pipefail

ROOT="${1:-$(pwd)}"

plan_file="$ROOT/docs/ref/PROJECT-PLAN.md"
profile_file="$ROOT/docs/ref/STACK-PROFILES.md"

[[ -f "$plan_file" ]] || {
  echo "MISSING: docs/ref/PROJECT-PLAN.md"
  exit 1
}

[[ -f "$profile_file" ]] || {
  echo "MISSING: docs/ref/STACK-PROFILES.md"
  exit 1
}

for heading in "## Task Intake" "## Impact Map" "## Sub-Agent Notes" "## Verify Matrix" "## Handoff Capsule"; do
  grep -q "$heading" "$plan_file" || {
    echo "INVALID: docs/ref/PROJECT-PLAN.md missing $heading"
    exit 1
  }
done

for profile in '`frontend-page`' '`backend-api`' '`edge-runtime`' '`runtime-qa`' '`docs-automation`'; do
  grep -q "$profile" "$profile_file" || {
    echo "INVALID: docs/ref/STACK-PROFILES.md missing $profile"
    exit 1
  }
done

echo "Planning check passed."
