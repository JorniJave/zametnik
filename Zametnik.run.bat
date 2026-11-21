@echo off
title Zametnik Run EXE
cd /d "%~dp0"

set "OUT=%LOCALAPPDATA%\ZametnikBuild"
set "EXE=%OUT%\win-unpacked\Zametnik.exe"

if not exist "%EXE%" (
  echo EXE not found. Build first: Zametnik.exe.bat
  echo Expected: %EXE%
  pause
  exit /b 1
)

taskkill /F /IM Zametnik.exe /T >nul 2>&1
echo Starting %EXE%
start "" "%EXE%"
exit /b 0
