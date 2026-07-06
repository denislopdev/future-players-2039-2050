# Deploy Future Players API on Render
$ErrorActionPreference = "Stop"

$url = "https://render.com/deploy?repo=https://github.com/denislopdev/online-players-m3u-extreme-code"

Write-Host "Opening Render one-click deploy..." -ForegroundColor Cyan
Write-Host $url -ForegroundColor Yellow
Write-Host ""
Write-Host "Steps:" -ForegroundColor Cyan
Write-Host "1. Sign in with GitHub"
Write-Host "2. Approve the Blueprint"
Write-Host "3. Wait until future-players-api is Live"
Write-Host "4. Test: https://future-players-api.onrender.com/"
Write-Host ""

Start-Process $url
