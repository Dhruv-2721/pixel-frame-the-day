@echo off
title PIXEL - Live Cloudflare Tunnel Watchdog
cd /d "%~dp0"

echo ==========================================================
echo   PIXEL -- Live Public Cloudflare Tunnel Watchdog
echo   Auto-Reconnects upon network disruption or idle disconnect
echo ==========================================================

set "CLOUDFLARED=%USERPROFILE%\.gemini\antigravity\scratch\tools\cloudflared.exe"

:tunnel_loop
echo [%date% %time%] Connecting Cloudflare Tunnel to http://localhost:5000...
"%CLOUDFLARED%" tunnel --url http://localhost:5000
echo [%date% %time%] Tunnel disconnected. Reconnecting in 5 seconds...
timeout /t 5 /nobreak >nul
goto tunnel_loop
