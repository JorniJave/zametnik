@echo off
title Zametnik Build EXE
cd /d "%~dp0"

call "%~dp0_zametnik-env.bat"
if errorlevel 1 (
  pause
  exit /b 1
)

set "OUT=%LOCALAPPDATA%\ZametnikBuild"
set "EXE=%OUT%\win-unpacked\Zametnik.exe"

echo.
echo Stopping old Zametnik processes...
taskkill /F /IM Zametnik.exe /T >nul 2>&1
taskkill /F /IM electron.exe /T >nul 2>&1
ping 127.0.0.1 -n 2 >nul

echo Building Zametnik...
call npm run build
if errorlevel 1 (
  echo.
  echo [ERROR] Build failed.
  pause
  exit /b 1
)

echo.
echo Packaging to %OUT%...
call npx electron-builder --win dir --config.directories.output="%OUT%"
if errorlevel 1 (
  echo.
  echo [ERROR] Packaging failed.
  pause
  exit /b 1
)

if not exist "%EXE%" (
  echo.
  echo [ERROR] EXE not found: %EXE%
  pause
  exit /b 1
)

echo.
echo Starting Zametnik...
start "" "%EXE%"
echo.
echo Done. EXE: %EXE%
echo Quick run without build: Zametnik.run.bat
pause
exit /b 0
