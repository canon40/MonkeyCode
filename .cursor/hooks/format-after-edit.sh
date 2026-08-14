#!/usr/bin/env bash
# Agent/Tab 파일 편집 직후 자동 포맷 — 빠른 코딩 피드백 루프
set -euo pipefail

payload="$(cat)"
file_path="$(printf '%s' "$payload" | python3 -c "import json,sys; print(json.load(sys.stdin).get('file_path',''))" 2>/dev/null || true)"

if [[ -z "$file_path" || ! -f "$file_path" ]]; then
  exit 0
fi

case "$file_path" in
  *.ts|*.tsx|*.js|*.jsx|*.mjs|*.css)
    if [[ "$file_path" == *"/frontend/"* ]] && [[ -f frontend/node_modules/.bin/prettier ]]; then
      rel="${file_path#*frontend/}"
      (cd frontend && npx prettier --write "$rel" 2>/dev/null) || true
    fi
    ;;
  *.go)
    if command -v gofmt >/dev/null 2>&1; then
      gofmt -w "$file_path" 2>/dev/null || true
    fi
    ;;
esac

exit 0
