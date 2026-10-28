<#
.SYNOPSIS
    Resets the Shona Assimil Desktop App runtime cache in %APPDATA%\shona-assimil-app.
.DESCRIPTION
    Closes any running Shona instances and removes cached expanded courses, user progress,
    and Chromium Local Storage so the app launches cleanly from the 100 base curriculum lessons.
#>

Write-Host "Stopping running Shona Assimil application instances..." -ForegroundColor Cyan
Stop-Process -Name "*Shona*", "*electron*" -Force -ErrorAction SilentlyContinue
Start-Sleep -Milliseconds 500

$appDataPath = "$env:APPDATA\shona-assimil-app"
if (Test-Path $appDataPath) {
    Remove-Item "$appDataPath\course_data_expanded.json*" -Force -ErrorAction SilentlyContinue
    Remove-Item "$appDataPath\user_progress.json" -Force -ErrorAction SilentlyContinue
    Remove-Item "$appDataPath\Local Storage" -Recurse -Force -ErrorAction SilentlyContinue
    Remove-Item "$appDataPath\Session Storage" -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "Successfully cleared expanded course and progress cache from AppData." -ForegroundColor Green
    Write-Host "The application is now reset to Lessons 1-100 with the 190 reserve pool." -ForegroundColor Green
} else {
    Write-Host "AppData directory not found. Nothing to reset." -ForegroundColor Yellow
}
