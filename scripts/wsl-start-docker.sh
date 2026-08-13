#!/usr/bin/env bash
# Start dockerd in WSL when systemd is unavailable or docker.service is inactive.
set -euo pipefail

if docker info >/dev/null 2>&1; then
  echo "Docker already running"
  docker version --format 'Server: {{.Server.Version}}'
  exit 0
fi

if command -v systemctl >/dev/null 2>&1; then
  systemctl start docker 2>/dev/null || true
  sleep 1
  if docker info >/dev/null 2>&1; then
    echo "Docker started via systemctl"
    exit 0
  fi
fi

echo "Starting dockerd in background..."
dockerd >/var/log/dockerd.log 2>&1 &
i=0
while [ "$i" -lt 40 ]; do
  if docker info >/dev/null 2>&1; then
    echo "dockerd is ready"
    exit 0
  fi
  i=$((i + 1))
  sleep 1
done

echo "Failed to start dockerd; see /var/log/dockerd.log" >&2
exit 1
