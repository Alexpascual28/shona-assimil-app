$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$env:PATH = "$scriptDir\tools\node;$env:PATH"
Set-Location "$scriptDir\app"
Write-Host "Starting Vite Dev Server..." -ForegroundColor Cyan
npm run dev
