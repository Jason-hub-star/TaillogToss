#!/usr/bin/env bash
set -euo pipefail

ROOT="${1:-$(pwd)}"

required_files=(
  "$ROOT/docs/ref/PROJECT-PLAN.md"
  "$ROOT/docs/ref/STACK-PROFILES.md"
  "$ROOT/docs/ops/agent-orchestration.md"
  "$ROOT/docs/status/DECISION-LOG.md"
  # 메타 커맨드 층 — 구 영문 커맨드 5종은 .claude/commands/_archive/ 로 이동(2026-08).
  # 현 규약은 한글 메타 5종(/상태 /다음 /진단 /마감 /명령어).
  # TODO(리뉴얼): 다음·진단·명령어 3종 신설 후 아래 목록에 추가해 5종 전수 강제.
  "$ROOT/.claude/skills/상태/SKILL.md"
  "$ROOT/.claude/skills/마감/SKILL.md"
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
