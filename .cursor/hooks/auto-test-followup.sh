#!/usr/bin/env bash
# 에이전트 턴 종료 시 — 코드 변경이 있으면 테스트 실행 follow-up 자동 주입
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
STATE_DIR="$ROOT/.cursor/hooks/.state"
LOG="$STATE_DIR/edited-files.log"

export HOOK_PAYLOAD
HOOK_PAYLOAD="$(cat)"

python3 - "$LOG" <<'PY'
import json, sys, os

log_path = sys.argv[1]
try:
    data = json.loads(os.environ.get("HOOK_PAYLOAD", "{}"))
except json.JSONDecodeError:
    sys.exit(0)

if data.get("status") != "completed":
    sys.exit(0)

if not os.path.isfile(log_path):
    sys.exit(0)

with open(log_path, encoding="utf-8") as f:
    lines = f.readlines()[-30:]

open(log_path, "w").close()

paths = sorted({line.strip().split("\t", 1)[-1] for line in lines if "\t" in line})
if not paths:
    sys.exit(0)

needs_frontend = any("frontend/" in p or p.startswith("frontend/") for p in paths)
needs_backend = any("backend/" in p or p.startswith("backend/") for p in paths)

parts = []
if needs_frontend:
    parts.append("frontend: `cd frontend && pnpm run test:unit`")
if needs_backend:
    parts.append("backend: `cd backend && go test ./...`")

if not parts:
    sys.exit(0)

followup = (
    "[자동 개입] 방금 수정한 코드에 대해 관련 테스트를 즉시 실행하세요: "
    + "; ".join(parts)
    + ". 실패하면 원인을 찾아 바로 수정하고 lint도 확인하세요. 사용자에게 묻지 말고 진행하세요."
)

print(json.dumps({"followup_message": followup}))
PY

exit 0
