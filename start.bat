@echo off
title Financia Server
cd /d "%~dp0"

echo ========================================
echo    FINANCIA - Starting...
echo ========================================
echo.

:: Kill any existing node processes
taskkill /f /im node.exe >nul 2>&1
timeout /t 2 /nobreak >nul

:: Start the production server (serves API + Frontend)
echo [1/2] Starting server on port 3001...
start "Financia Server" /min cmd /c "cd /d "%~dp0server" && npx tsx src/index.ts"
timeout /t 6 /nobreak >nul

:: Verify server is running
echo [2/2] Creating public tunnel...
start "Financia Tunnel" /min cmd /c "cd /d "%~dp0" && node tunnel.js"
timeout /t 10 /nobreak >nul

:: Show the URL from the tunnel output
echo.
echo ========================================
echo    FINANCIA IS RUNNING!
echo ========================================
echo.
echo    Local:  http://localhost:3001
echo    Public: Check the "Financia Tunnel" window
echo.
echo    Demo:   demo@financia.app
echo    Pass:   demo1234
echo.
echo    PRESS ANY KEY TO STOP THE SERVER
echo ========================================
pause >nul

:: Cleanup
taskkill /f /im node.exe >nul 2>&1
echo Server stopped.
