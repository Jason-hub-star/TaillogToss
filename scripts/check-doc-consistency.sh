#!/usr/bin/env bash
set -euo pipefail

ROOT="${1:-$(pwd)}"

required_refs=(
  "$ROOT/docs/status/PROJECT-STATUS.md"
  "$ROOT/docs/status/11-FEATURE-PARITY-MATRIX.md"
  "$ROOT/docs/status/DECISION-LOG.md"
  "$ROOT/docs/ref/PROJECT-PLAN.md"
  "$ROOT/docs/ref/STACK-PROFILES.md"
  "$ROOT/docs/ops/agent-orchestration.md"
)

for file in "${required_refs[@]}"; do
  [[ -f "$file" ]] || {
    echo "MISSING: ${file#$ROOT/}"
    exit 1
  }
done

grep -q "DECISION-LOG.md" "$ROOT/HARNESS-MANIFEST.yaml" || {
  echo "INVALID: HARNESS-MANIFEST.yaml missing DECISION-LOG reference"
  exit 1
}

grep -q "/impact-map" "$ROOT/docs/ops/agent-orchestration.md" || {
  echo "INVALID: docs/ops/agent-orchestration.md missing command references"
  exit 1
}

echo "Doc consistency check passed."
