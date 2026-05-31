param(
  [switch]$Persist,
  [switch]$NoTunnel
)

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ServerDir = Join-Path $ScriptDir "server"
$ClientDir = Join-Path $ScriptDir "client"

function Write-Banner {
  Clear-Host
  Write-Host "╔══════════════════════════════════════════════╗" -ForegroundColor Green
  Write-Host "║         FINANCIA - Deployment Script        ║" -ForegroundColor Green
  Write-Host "╚══════════════════════════════════════════════╝" -ForegroundColor Green
  Write-Host ""
}

function Write-URL {
  param($Url)
  Write-Host ""
  Write-Host "╔══════════════════════════════════════════════════╗" -ForegroundColor Cyan
  Write-Host "║         🚀  FINANCIA SAAS - EN VIVO            ║" -ForegroundColor Cyan
  Write-Host "╠══════════════════════════════════════════════════╣" -ForegroundColor Cyan
  Write-Host "║                                                  ║" -ForegroundColor Cyan
  Write-Host "║  📱  $($Url.PadRight(47))║" -ForegroundColor White
  Write-Host "║                                                  ║" -ForegroundColor Cyan
  Write-Host "║  🔑  Credenciales Demo:                         ║" -ForegroundColor Cyan
  Write-Host "║  📧  demo@financia.app                          ║" -ForegroundColor Cyan
  Write-Host "║  🔐  demo1234                                   ║" -ForegroundColor Cyan
  Write-Host "║                                                  ║" -ForegroundColor Cyan
  Write-Host "║  ⚠️  PRIMERA VEZ EN EL NAVEGADOR:              ║" -ForegroundColor Yellow
  Write-Host "║  1. Abre la URL                                 ║" -ForegroundColor Yellow
  Write-Host "║  2. Haz clic en 'Click to Continue'             ║" -ForegroundColor Yellow
  Write-Host "║  3. Inicia sesión con las credenciales demo     ║" -ForegroundColor Yellow
  Write-Host "║                                                  ║" -ForegroundColor Yellow
  Write-Host "║  💡  Instálala como App en tu celular:          ║" -ForegroundColor Cyan
  Write-Host "║  Android: Chrome → Menú → Instalar app         ║" -ForegroundColor Cyan
  Write-Host "║  iPhone:  Safari → Compartir → Pantalla Inicio ║" -ForegroundColor Cyan
  Write-Host "║  PC:      Chrome → 🔒 → Instalar Financia     ║" -ForegroundColor Cyan
  Write-Host "║                                                  ║" -ForegroundColor Cyan
  Write-Host "╚═══════════════════════════════════════════════╝" -ForegroundColor Cyan
  Write-Host ""
}

Write-Banner

# Kill old processes
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# Build frontend if needed
$DistDir = Join-Path $ClientDir "dist"
if (!(Test-Path (Join-Path $DistDir "index.html"))) {
  Write-Host "📦 Building frontend..." -ForegroundColor Yellow
  Set-Location $ClientDir
  npx vite build 2>&1 | Out-Null
  Write-Host "✅ Frontend built!" -ForegroundColor Green
}

# Start server
Write-Host "🚀 Starting Financia server..." -ForegroundColor Yellow
$ServerJob = Start-Job -ScriptBlock {
  param($D)
  Set-Location $D
  npx tsx src/index.ts
} -ArgumentList $ServerDir

Start-Sleep -Seconds 8

# Verify
try {
  $Health = Invoke-WebRequest -Uri "http://localhost:3001/api/health" -UseBasicParsing -TimeoutSec 5
  Write-Host "✅ Server: $($Health.Content)" -ForegroundColor Green
} catch {
  Write-Host "❌ Server failed to start!" -ForegroundColor Red
  exit 1
}

if ($NoTunnel) {
  Write-Host ""
  Write-Host "📡 Local access only: http://localhost:3001" -ForegroundColor Yellow
  Write-Host ""
  Write-Host "🛑 Press Ctrl+C to stop" -ForegroundColor Gray
  while ($true) { Start-Sleep -Seconds 60 }
  return
}

# Create tunnel
Write-Host "🔗 Creating public tunnel..." -ForegroundColor Yellow

# Try localtunnel
$env:NODE_PATH = "$env:APPDATA\npm\node_modules"
$TunnelJob = Start-Job -ScriptBlock {
  $env:NODE_PATH = "$env:APPDATA\npm\node_modules"
  Set-Location $using:ScriptDir
  node -e "
    const lt = require('localtunnel');
    (async () => {
      try {
        const t = await lt({ port: 3001 });
        console.log('PUBLIC_URL:' + t.url);
        t.on('close', () => { console.log('TUNNEL_CLOSED'); process.exit(1); });
      } catch(e) {
        console.log('TUNNEL_FAIL:' + e.message);
        process.exit(1);
      }
    })();
  "
}

Start-Sleep -Seconds 10

$Output = Receive-Job -Job $TunnelJob -ErrorAction SilentlyContinue
$Url = $null
if ($Output -match "PUBLIC_URL:(https?://[^\s]+)") {
  $Url = $matches[1]
}

if ($Url) {
  Write-URL -Url $Url
  
  # Keep alive check
  $CheckJob = Start-Job -ScriptBlock {
    param($U)
    while ($true) {
      try {
        [System.Net.ServicePointManager]::ServerCertificateValidationCallback = { $true }
        $r = Invoke-WebRequest -Uri "$U/api/health" -UseBasicParsing -TimeoutSec 10
        $d = (Get-Date).ToString("HH:mm:ss")
        Write-Host "[$d] ✅ Tunnel alive" -ForegroundColor Gray
      } catch {
        $d = (Get-Date).ToString("HH:mm:ss")
        Write-Host "[$d] ❌ Tunnel check failed" -ForegroundColor Red
      }
      Start-Sleep -Seconds 30
    }
  } -ArgumentList $Url
  
  Write-Host ""
  Write-Host "📡 Monitoring tunnel (checking every 30s)..." -ForegroundColor Gray
  Write-Host "🛑 Press Ctrl+C to stop everything" -ForegroundColor Gray
  Write-Host ""
  
  while ($true) {
    Start-Sleep -Seconds 5
    # Check server health
    try {
      $null = Invoke-WebRequest -Uri "http://localhost:3001/api/health" -UseBasicParsing -TimeoutSec 3
    } catch {
      Write-Host "`n❌ Server stopped!" -ForegroundColor Red
      break
    }
  }
} else {
  Write-Host "⚠️  Tunnel output: $Output" -ForegroundColor Yellow
  Write-Host ""
  Write-Host "📡 Local access: http://localhost:3001" -ForegroundColor Yellow
  Write-Host ""
  while ($true) { Start-Sleep -Seconds 60 }
}
