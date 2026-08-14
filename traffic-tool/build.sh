#!/usr/bin/env bash
# Build a single-file TrafficCheck executable for the CURRENT OS
# (Linux -> ELF binary, macOS -> .app/binary). Run this on the OS you want to
# target: PyInstaller does NOT cross-compile.
set -euo pipefail
cd "$(dirname "$0")"

PYTHON="${PYTHON:-python3}"

"$PYTHON" -m pip install --upgrade pip >/dev/null
"$PYTHON" -m pip install -r requirements.txt

"$PYTHON" -m PyInstaller \
  --noconfirm --clean \
  --onefile \
  --windowed \
  --name TrafficCheck \
  run_gui.py

echo
echo "Done. Executable is in: ./dist/"
ls -la dist/
