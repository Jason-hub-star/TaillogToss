#!/usr/bin/env bash
set -euo pipefail

ROOT="${1:-$(pwd)}"

required_files=(
  "$ROOT/docs/ref/PROJECT-PLAN.md"
  "$ROOT/docs/ref/STACK-PROFILES.md"
  "$ROOT/docs/ops/agent-orchestration.md"
  "$ROOT/docs/status/DECISION-LOG.md"
  "$ROOT/.claude/commands/intake.md"
  "$ROOT/.claude/commands/impact-map.md"
  "$ROOT/.claude/commands/evidence-review.md"
  "$ROOT/.claude/commands/handoff.md"
  "$ROOT/.claude/commands/profile-recommend.md"
)

for file in "${required_files[@]}"; do
  [[ -f "$file" ]] || {
    echo "MISSING: ${file#$ROOT/}"
    exit 1
  }
done

grep -q "## Task Intake" "$ROOT/docs/ref/PROJECT-PLAN.md" || {
  echo "INVALID: docs/ref/PROJECT-PLAN.md missing Task Intake section"
  exit 1
}

grep -q "## Impact Map" "$ROOT/docs/ref/PROJECT-PLAN.md" || {
  echo "INVALID: docs/ref/PROJECT-PLAN.md missing Impact Map section"
  exit 1
}

grep -q "## Handoff Capsule" "$ROOT/docs/ref/PROJECT-PLAN.md" || {
  echo "INVALID: docs/ref/PROJECT-PLAN.md missing Handoff Capsule section"
  exit 1
}

echo "Agent layer check passed."
