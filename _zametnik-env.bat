@echo off
REM Project setup: cd, Node.js, npm install
cd /d "%~dp0"

where node >nul 2>&1
if errorlevel 1 (
  echo.
  echo [ERROR] Node.js not found. Install from https://nodejs.org/
  exit /b 1
)

where npm >nul 2>&1
if errorlevel 1 (
  echo.
  echo [ERROR] npm not found.
  exit /b 1
)

if not exist "node_modules\" (
  echo.
  echo Running npm install...
  call npm install
  if errorlevel 1 exit /b 1
)

exit /b 0
