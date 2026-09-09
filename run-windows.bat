@echo off
REM RTL-Terminal launcher for Windows
REM Double-click this file to run
title RTL-Terminal (Arabic RTL Support)
cd /d "%~dp0"

where node >nul 2>nul
if %errorlevel% neq 0 (
  echo [ERROR] Node.js is not installed!
  echo Download it from: https://nodejs.org/
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo Installing dependencies (first run)...
  call npm install
  echo.
  echo OPTIONAL - for real PowerShell shell (recommended):
  echo   npm install node-pty
  echo.
)

echo Starting RTL-Terminal...
echo Open in browser: http://localhost:3000
echo Press Ctrl+C to stop.
echo.
call npm start
pause
