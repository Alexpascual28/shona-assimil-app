@echo off
setlocal
cd /d "%~dp0"
set "PATH=%~dp0tools\node;%PATH%"
cd app
echo Starting Vite Dev Server...
npm run dev
