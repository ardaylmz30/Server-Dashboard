@echo off
setlocal
cd /d "%~dp0"

echo Starting Server Dashboard Windows metrics agent...
start "Server Dashboard Host Metrics" /min cmd /c "cd /d "%~dp0" && :loop && powershell.exe -NoProfile -ExecutionPolicy Bypass -File "host-agent\host_metrics.ps1" & goto loop"

timeout /t 1 /nobreak >nul

echo Starting Server Dashboard containers...
docker compose up --build

pause