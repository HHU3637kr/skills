#!/usr/bin/env bash
# Install token-efficiency v0.2 — global skill + hint
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
PY="${PYTHON:-python3}"
if ! command -v "$PY" >/dev/null 2>&1; then PY=python; fi
"$PY" "$ROOT/scripts/install_skill.py" --write "$@"
echo ""
echo "Next: $PY $ROOT/scripts/setup_student.py"
echo "Docs:  $ROOT/docs/学员安装指南.md"
