@echo off
title PIXEL - FRAME THE DAY (Permanent Server Watchdog)
cd /d "%~dp0"

echo ==========================================================
echo   PIXEL -- FRAME THE DAY  (Permanent Server Daemon)
echo   LNCT Group of Colleges, Bhopal
echo   Security: Active (CSP, Rate Limiter, Anti-DoS, Auto-Backup)
echo ==========================================================

:: Set Node environment if portable node is used
if exist "%USERPROFILE%\.gemini\antigravity\scratch\tools\node-v20.18.0-win-x64\node.exe" (
    set "PATH=%USERPROFILE%\.gemini\antigravity\scratch\tools\node-v20.18.0-win-x64;%PATH%"
)

:loop
echo [%date% %time%] Starting backend server on http://localhost:5000...
node server/src/server.js
echo [%date% %time%] Server process stopped or crashed. Restarting in 3 seconds...
timeout /t 3 /nobreak >nul
goto loop
