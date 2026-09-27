@echo off
setlocal
cd /d "%~dp0"

echo Starting Server Dashboard Windows metrics agent...
start "Server Dashboard Host Metrics" /min "%~dp0host-agent\run_agent_loop.bat"

timeout /t 1 /nobreak >nul

echo Starting Server Dashboard containers...
docker compose up --build

pause