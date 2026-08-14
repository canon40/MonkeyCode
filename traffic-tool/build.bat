@echo off
REM ===================================================================
REM  Build TrafficCheck for Windows.
REM  Run on a Windows PC with Python 3.8+ installed.
REM
REM  Produces (end users need NONE of Python / other installers):
REM    1) TrafficCheck-windows.zip   - portable folder (unzip & run)
REM    2) TrafficCheck-Setup.exe      - single installer (if Inno Setup found)
REM ===================================================================
setlocal enabledelayedexpansion
cd /d "%~dp0"

set PYTHON=py -3
%PYTHON% --version >nul 2>nul || set PYTHON=python

%PYTHON% -m pip install --upgrade pip
%PYTHON% -m pip install cx_Freeze>=6.15

REM Clean previous build
if exist build rmdir /s /q build
if exist TrafficCheck-windows rmdir /s /q TrafficCheck-windows
if exist TrafficCheck-windows.zip del /q TrafficCheck-windows.zip
if exist TrafficCheck-Setup.exe del /q TrafficCheck-Setup.exe

REM 1) Freeze the app (self-contained: python DLL + tk + VC runtime bundled)
%PYTHON% setup_cxfreeze.py build
if errorlevel 1 goto :err

for /d %%D in (build\exe.win*) do set OUTDIR=%%D
echo Built: %OUTDIR%

REM Portable zip
robocopy "%OUTDIR%" "TrafficCheck-windows" /E >nul
powershell -NoProfile -Command "Compress-Archive -Path 'TrafficCheck-windows\*' -DestinationPath 'TrafficCheck-windows.zip' -Force"

REM 2) Single-file installer via Inno Setup (optional, if installed)
set "ISCC=%ProgramFiles(x86)%\Inno Setup 6\ISCC.exe"
if not exist "%ISCC%" set "ISCC=%ProgramFiles%\Inno Setup 6\ISCC.exe"
if exist "%ISCC%" (
  echo Building installer with Inno Setup ...
  "%ISCC%" /DSourceDir=%OUTDIR% TrafficCheck.iss
) else (
  echo [skip] Inno Setup not found - installer not built.
  echo         Install from https://jrsoftware.org/isdl.php  then re-run to get TrafficCheck-Setup.exe
)

echo.
echo Done!
echo   - Portable:  TrafficCheck-windows.zip   ^(unzip, run TrafficCheck.exe^)
if exist TrafficCheck-Setup.exe echo   - Installer: TrafficCheck-Setup.exe      ^(run it; installs with no prerequisites^)
goto :eof

:err
echo Build failed.
exit /b 1
endlocal
