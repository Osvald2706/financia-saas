@echo off
title Financia Tunnel
cd /d "C:\Users\OSVALDO\Downloads\Open Code\financia-saas"
set NODE_PATH=%APPDATA%\npm\node_modules
node -e "const lt=require('localtunnel');(async()=>{const t=await lt({port:3001,subdomain:'financiashow'});console.log('');console.log('========================================');console.log('  FINANCIA - Public URL:');console.log('  '+t.url);console.log('========================================');console.log('  Demo: demo@financia.app / demo1234');console.log('  Cierra esta ventana para cerrar');console.log('========================================');console.log('');setInterval(()=>{},1<<30);})()"
pause
