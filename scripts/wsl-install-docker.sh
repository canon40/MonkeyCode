#!/usr/bin/env bash
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

echo "==> Installing prerequisites"
apt-get update -qq
apt-get install -y -qq ca-certificates curl gnupg >/dev/null

echo "==> Adding Docker apt repository"
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
CODENAME=$(. /etc/os-release; echo "$VERSION_CODENAME")
ARCH=$(dpkg --print-architecture)
printf 'deb [arch=%s signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu %s stable\n' "$ARCH" "$CODENAME" > /etc/apt/sources.list.d/docker.list

echo "==> Installing Docker Engine"
apt-get update -qq
apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-compose-plugin docker-buildx-plugin

echo "==> Starting dockerd"
if ! pgrep -x dockerd >/dev/null 2>&1; then
  dockerd >/var/log/dockerd.log 2>&1 &
  i=0
  while [ "$i" -lt 40 ]; do
    if docker info >/dev/null 2>&1; then
      break
    fi
    i=$((i + 1))
    sleep 1
  done
fi

docker version
docker compose version
echo DOCKER_INSTALL_OK
