@echo off
REM Build TrafficCheck.exe for Windows (run this on a Windows PC).
REM PyInstaller does NOT cross-compile, so build on Windows to get an .exe.
setlocal
cd /d "%~dp0"

set PYTHON=py
where %PYTHON% >nul 2>nul || set PYTHON=python

%PYTHON% -m pip install --upgrade pip
%PYTHON% -m pip install -r requirements.txt

%PYTHON% -m PyInstaller ^
  --noconfirm --clean ^
  --onefile ^
  --windowed ^
  --name TrafficCheck ^
  run_gui.py

echo.
echo Done. Find TrafficCheck.exe in the dist\ folder.
dir dist
endlocal
