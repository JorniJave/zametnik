@echo off
title Zametnik
cd /d "%~dp0"

call "%~dp0_zametnik-env.bat"
if errorlevel 1 (
  pause
  exit /b 1
)

echo.
echo  Zametnik - choose mode:
echo.
echo    1 - Build and run EXE
echo    2 - Dev mode (Electron + Vite)  [default]
echo    3 - Browser only (Vite)
echo    4 - Run built EXE (no build)
echo.
set /p CHOICE="Choice [2]: "
if "%CHOICE%"=="" set CHOICE=2

if "%CHOICE%"=="1" (
  call "%~dp0Zametnik.exe.bat"
  exit /b %ERRORLEVEL%
)

if "%CHOICE%"=="4" (
  call "%~dp0Zametnik.run.bat"
  exit /b %ERRORLEVEL%
)

if "%CHOICE%"=="3" (
  echo.
  echo  Browser: http://127.0.0.1:5173/
  echo  Stop: Ctrl+C
  echo.
  taskkill /F /IM electron.exe /T >nul 2>&1
  call npm run dev
  echo.
  pause
  exit /b %ERRORLEVEL%
)

REM Choice 2 - dev
call "%~dp0Zametnik.dev.bat"
exit /b %ERRORLEVEL%
