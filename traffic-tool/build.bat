@echo off
REM ===================================================================
REM  Build a self-contained Windows program for TrafficCheck.
REM  Run this on a Windows PC (Python 3.8+ installed).
REM  Output: a folder you can copy to ANY Windows PC (no Python needed);
REM          also zipped as TrafficCheck-windows.zip.
REM ===================================================================
setlocal
cd /d "%~dp0"

set PYTHON=py -3
%PYTHON% --version >nul 2>nul || set PYTHON=python

%PYTHON% -m pip install --upgrade pip
%PYTHON% -m pip install cx_Freeze>=6.15

REM Clean previous build
if exist build rmdir /s /q build
if exist TrafficCheck-windows rmdir /s /q TrafficCheck-windows
if exist TrafficCheck-windows.zip del /q TrafficCheck-windows.zip

REM Freeze (cx_Freeze uses the standard python DLL loader -> reliable on all Windows)
%PYTHON% setup_cxfreeze.py build
if errorlevel 1 goto :err

REM Copy the produced exe folder to a friendly name and zip it
for /d %%D in (build\exe.win*) do set OUTDIR=%%D
robocopy "%OUTDIR%" "TrafficCheck-windows" /E >nul
powershell -NoProfile -Command "Compress-Archive -Path 'TrafficCheck-windows\*' -DestinationPath 'TrafficCheck-windows.zip' -Force"

echo.
echo Done!
echo   - Folder: TrafficCheck-windows\  (run TrafficCheck.exe)
echo   - Zip:    TrafficCheck-windows.zip  (share/copy to other PCs)
goto :eof

:err
echo Build failed.
exit /b 1
endlocal
