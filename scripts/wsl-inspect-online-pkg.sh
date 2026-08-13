#!/usr/bin/env bash
set -euo pipefail
TMP=$(mktemp -d)
cd "$TMP"
echo "TMP=$TMP"
curl -4fL --retry 3 --connect-timeout 30 -o pkg.tgz \
  'https://monkeycode-release.oss-cn-hangzhou.aliyuncs.com/online-package%2Fv260804%2Fmonkeycode-online-linux-amd64.tgz?Expires=1786612993&OSSAccessKeyId=LTAI5tP2W4mnLDh2HPZHZwkm&Signature=232VgsqMQ%2Ftu4R2HTQNPUql4sh8%3D'
ls -lh pkg.tgz
mkdir extract
tar -xzf pkg.tgz -C extract
find extract -maxdepth 4 -type f | head -n 100
echo '---INSTALL---'
INSTALL=$(find extract -name install.sh | head -n 1)
echo "INSTALL=$INSTALL"
sed -n '1,120p' "$INSTALL"
echo '---DONE_INSPECT---'
# keep path for later
echo "$TMP" > /tmp/monkeycode-pkg-dir.txt
