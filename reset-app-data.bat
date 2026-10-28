@echo off
setlocal
cd /d "%~dp0"
echo Resetting Shona Assimil runtime cache...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\reset-app-data.ps1"
pause
