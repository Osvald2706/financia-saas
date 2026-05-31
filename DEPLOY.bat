@echo off
title FINANCIA - Server
cd /d "%~dp0"

echo ========================================
echo    FINANCIA - Iniciando...
echo ========================================
echo.

:: Kill any node processes
taskkill /f /im node.exe >nul 2>&1
timeout /t 2 /nobreak >nul

:: Start server
echo [1/3] Iniciando servidor...
start "Financia Server" /min cmd /c "cd /d "%~dp0server" && npx tsx src/index.ts"
timeout /t 7 /nobreak >nul

:: Verify
echo [2/3] Verificando...
powershell -Command "try { $r = Invoke-WebRequest -Uri 'http://localhost:3001/api/health' -UseBasicParsing -TimeoutSec 5; Write-Host 'OK' } catch { Write-Host 'FAIL' }" > "%TEMP%\financia_check.txt"
set /p CHECK=<"%TEMP%\financia_check.txt"
if "%CHECK%"=="FAIL" (
    echo ERROR: Server failed to start
    pause
    exit /b 1
)
echo    Servidor OK!

:: Start tunnel
echo [3/3] Creando tunel publico...
start "Financia Tunnel" cmd /c "cd /d "%~dp0" && node tunnel.js"
timeout /t 12 /nobreak >nul

echo.
echo ========================================
echo    FINANCIA ESTA CORRIENDO!
echo ========================================
echo.
echo    Revisa la ventana "Financia Tunnel"
echo    para ver la URL publica.
echo.
echo    Alternativamente:
echo    Local: http://localhost:3001
echo.
echo    Demo:  demo@financia.app
echo    Pass:  demo1234
echo.
echo    PRESIONA CUALQUIER TECLA PARA DETENER
echo ========================================
pause >nul

:: Cleanup
taskkill /f /im node.exe >nul 2>&1
echo Servidor detenido.
