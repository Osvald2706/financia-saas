param(
  [string]$Subdomain = "financia-saas"
)

Write-Host "╔══════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║       FINANCIA - Deployment Script          ║" -ForegroundColor Green
Write-Host "╚══════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

$ServerDir = Join-Path $PSScriptRoot "server"
$ClientDir = Join-Path $PSScriptRoot "client"

# Kill any existing processes on port 3001
Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.Id -ne $pid } | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# Build frontend if not already built
$DistDir = Join-Path $ClientDir "dist"
if (!(Test-Path (Join-Path $DistDir "index.html"))) {
  Write-Host "📦 Building frontend..." -ForegroundColor Yellow
  Set-Location $ClientDir
  npx vite build 2>&1 | Out-Null
  Write-Host "✅ Frontend built!" -ForegroundColor Green
}

# Start the production server
Write-Host "🚀 Starting Financia server..." -ForegroundColor Yellow
$ServerJob = Start-Job -ScriptBlock {
  param($Dir)
  Set-Location $Dir
  npx tsx src/index.ts
} -ArgumentList $ServerDir

Start-Sleep -Seconds 6

# Verify server is running
try {
  $Health = Invoke-WebRequest -Uri "http://localhost:3001/api/health" -UseBasicParsing -TimeoutSec 5
  Write-Host "✅ Server running: $($Health.Content)" -ForegroundColor Green
} catch {
  Write-Host "❌ Server failed to start!" -ForegroundColor Red
  exit 1
}

# Try multiple tunnel methods
$PublicUrl = $null

# Method 1: Try to use localtunnel
Write-Host "🔗 Creating public tunnel with localtunnel..." -ForegroundColor Yellow
try {
  $env:LT_PORT = "3001"
  $LTJob = Start-Job -ScriptBlock {
    param($Sub)
    lt --port 3001 --subdomain $Sub 2>&1
  } -ArgumentList $Subdomain

  Start-Sleep -Seconds 10
  
  # Try to extract the URL from job output
  $Output = Receive-Job -Job $LTJob -ErrorAction SilentlyContinue
  if ($Output -match "https?://[^\s]+") {
    $PublicUrl = $matches[0]
  } else {
    # Try with a random subdomain
    Stop-Job $LTJob -ErrorAction SilentlyContinue
    Remove-Job $LTJob -ErrorAction SilentlyContinue
    
    $LTJob = Start-Job -ScriptBlock {
      lt --port 3001 2>&1
    }
    Start-Sleep -Seconds 10
    $Output = Receive-Job -Job $LTJob -ErrorAction SilentlyContinue
    if ($Output -match "https?://[^\s]+") {
      $PublicUrl = $matches[0]
    }
  }
} catch {
  Write-Host "⚠️ localtunnel failed: $_" -ForegroundColor Yellow
}

# Method 2: Try ngrok via Node.js API
if (-not $PublicUrl) {
  Write-Host "🔗 Trying ngrok..." -ForegroundColor Yellow
  try {
    $NgrokScript = @"
const ngrok = require('ngrok');
(async () => {
  try {
    const url = await ngrok.connect({ addr: 3001, authtoken_from_env: true });
    console.log(url);
  } catch(e) {
    try {
      const url = await ngrok.connect({ addr: 3001 });
      console.log(url);
    } catch(e2) {
      console.error('ngrok failed: ' + e2.message);
      process.exit(1);
    }
  }
})();
"@
    $NgrokResult = node -e $NgrokScript 2>&1
    if ($NgrokResult -match "https?://[^\s]+") {
      $PublicUrl = $matches[0]
    }
  } catch {
    Write-Host "⚠️ ngrok failed: $_" -ForegroundColor Yellow
  }
}

Write-Host ""
Write-Host "╔══════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                🚀 FINANCIA                    ║" -ForegroundColor Cyan

if ($PublicUrl) {
  Write-Host "╠══════════════════════════════════════════════╣" -ForegroundColor Cyan
  Write-Host "║                                              ║" -ForegroundColor Cyan
  Write-Host "║  Public URL:                                  ║" -ForegroundColor Cyan
  Write-Host "║  $($PublicUrl.PadRight(44))║" -ForegroundColor White
  Write-Host "║                                              ║" -ForegroundColor Cyan
  Write-Host "║  📱 Open this URL on your phone!             ║" -ForegroundColor Cyan
  Write-Host "║                                              ║" -ForegroundColor Cyan
  Write-Host "╠══════════════════════════════════════════════╣" -ForegroundColor Cyan
  Write-Host "║  Demo: demo@financia.app / demo1234         ║" -ForegroundColor Cyan
  Write-Host "╚══════════════════════════════════════════════╝" -ForegroundColor Cyan
} else {
  Write-Host "║  ⚠️  Could not create public tunnel            ║" -ForegroundColor Yellow
  Write-Host "║  Access locally: http://localhost:3001        ║" -ForegroundColor Yellow
  Write-Host "╚══════════════════════════════════════════════╝" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "📋 Credentials: demo@financia.app / demo1234" -ForegroundColor Gray
Write-Host "🛑 Press Ctrl+C to stop the server" -ForegroundColor Gray
Write-Host ""

# Keep the script running
while ($true) {
  Start-Sleep -Seconds 10
  # Check if server is still running
  try {
    $null = Invoke-WebRequest -Uri "http://localhost:3001/api/health" -UseBasicParsing -TimeoutSec 3
  } catch {
    Write-Host "❌ Server stopped unexpectedly. Restarting..." -ForegroundColor Red
    exit 1
  }
}
