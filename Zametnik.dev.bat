@echo off
title Zametnik Dev
cd /d "%~dp0"

call "%~dp0_zametnik-env.bat"
if errorlevel 1 (
  pause
  exit /b 1
)

echo.
echo  Zametnik - development mode
echo  Browser: http://127.0.0.1:5173/
echo  Stop: Ctrl+C or close this window
echo.

echo Stopping old processes...
taskkill /F /IM Zametnik.exe /T >nul 2>&1
taskkill /F /IM electron.exe /T >nul 2>&1
ping 127.0.0.1 -n 2 >nul

call npm run electron:dev
set EXIT_CODE=%ERRORLEVEL%

echo.
if not "%EXIT_CODE%"=="0" (
  echo [ERROR] Exit code %EXIT_CODE%
) else (
  echo Server stopped.
)
pause
exit /b %EXIT_CODE%
