@echo off
setlocal
cd /d "%~dp0"
set "PATH=%~dp0tools\node;%PATH%"
cd app
echo Launching Shona Assimil Desktop App...
npm run electron:start
