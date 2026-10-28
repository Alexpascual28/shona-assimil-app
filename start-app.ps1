$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$env:PATH = "$scriptDir\tools\node;$env:PATH"
Set-Location "$scriptDir\app"
Write-Host "Launching Shona Assimil Desktop App..." -ForegroundColor Green
npm run electron:start
