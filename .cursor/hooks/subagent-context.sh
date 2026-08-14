#!/usr/bin/env bash
# 서브에이전트(직원) 시작 시 조직·빠른 코딩 정책 주입
set -euo pipefail

payload="$(cat)"
task="$(printf '%s' "$payload" | python3 -c "import json,sys; print(json.load(sys.stdin).get('task',''))" 2>/dev/null || true)"

# subagentStart output: permission allow (default exit 0)
# 추가 컨텍스트는 task 문자열에 이미 포함되어야 하므로 로그만 남김
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
STATE_DIR="$ROOT/.cursor/hooks/.state"
mkdir -p "$STATE_DIR"
printf '%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ) subagent: ${task:0:120}" >>"$STATE_DIR/subagent.log"

exit 0
