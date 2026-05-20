#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

bash "$ROOT/scripts/check-agent-layer.sh" "$ROOT" >/dev/null
bash "$ROOT/scripts/check-planning.sh" "$ROOT" >/dev/null
bash "$ROOT/scripts/check-doc-consistency.sh" "$ROOT" >/dev/null

echo "Harness check passed."
