#!/usr/bin/env bash
set -euo pipefail
OUT=/mnt/d/@code/monkeycode/.cache/online-pkg
mkdir -p "$OUT"
cd "$OUT"
if [ ! -f pkg.tgz ]; then
  curl -4fL --retry 3 --connect-timeout 30 -o pkg.tgz \
    'https://monkeycode-release.oss-cn-hangzhou.aliyuncs.com/online-package%2Fv260804%2Fmonkeycode-online-linux-amd64.tgz?Expires=1786612993&OSSAccessKeyId=LTAI5tP2W4mnLDh2HPZHZwkm&Signature=232VgsqMQ%2Ftu4R2HTQNPUql4sh8%3D'
fi
rm -rf extract
mkdir extract
tar -xzf pkg.tgz -C extract
DIR="$OUT/extract/monkeycode-online-linux-amd64"
ls -la "$DIR"
echo '=== package.env ==='
cat "$DIR/package.env"
echo '=== .env.example ==='
cat "$DIR/.env.example"
echo '=== manifest ==='
cat "$DIR/manifest.json"
echo '=== compose services ==='
grep -E '^  [a-z0-9_-]+:' "$DIR/docker-compose.yml" || true
echo '===DONE==='
