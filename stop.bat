@echo off
setlocal
cd /d "%~dp0"

echo Stopping Server Dashboard containers...
docker compose down

echo Stopping Windows metrics agent...
taskkill /FI "WINDOWTITLE eq Server Dashboard Host Metrics*" /T /F >nul 2>&1

echo Done.
pause
