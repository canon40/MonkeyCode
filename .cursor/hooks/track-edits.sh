#!/usr/bin/env bash
# Write/Edit 도구 사용 시 변경 파일 기록 — stop 훅에서 테스트 follow-up 판단
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
STATE_DIR="$ROOT/.cursor/hooks/.state"
mkdir -p "$STATE_DIR"
LOG="$STATE_DIR/edited-files.log"

export HOOK_PAYLOAD
HOOK_PAYLOAD="$(cat)"

python3 - "$LOG" <<'PY'
import json, sys, os
from datetime import datetime, timezone

log_path = sys.argv[1]
raw = os.environ.get("HOOK_PAYLOAD", "")
if not raw.strip():
    sys.exit(0)
try:
    data = json.loads(raw)
except json.JSONDecodeError:
    sys.exit(0)

tool = data.get("tool_name", "")
tool_input = data.get("tool_input") or {}
paths = []

if tool in ("Write", "StrReplace", "EditNotebook"):
    path = tool_input.get("path") or tool_input.get("target_notebook")
    if path:
        paths.append(path)

if not paths:
    sys.exit(0)

os.makedirs(os.path.dirname(log_path), exist_ok=True)
ts = datetime.now(timezone.utc).isoformat()
with open(log_path, "a", encoding="utf-8") as f:
    for p in paths:
        f.write(f"{ts}\t{p}\n")
PY

exit 0
