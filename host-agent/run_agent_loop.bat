@echo off
cd /d "%~dp0"

:loop
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "host_metrics.ps1"
timeout /t 1 /nobreak >nul
goto loop