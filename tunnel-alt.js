const http = require('http');
const { execSync } = require('child_process');

async function checkServer() {
  return new Promise((resolve, reject) => {
    const req = http.get('http://localhost:3001/api/health', (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(JSON.parse(data)));
    });
    req.on('error', reject);
    req.setTimeout(5000, () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

async function tryBore() {
  // Try using bore if installed
  try {
    execSync('bore --version', { stdio: 'ignore' });
    const { execSync } = require('child_process');
    const result = execSync('bore local 3001 --to bore.pub', { encoding: 'utf8', timeout: 10000 });
    const match = result.match(/https?:\/\/[^\s]+/);
    if (match) return match[0];
  } catch {}
  return null;
}

async function main() {
  console.log('🔍 Verifying Financia server...');
  try {
    await checkServer();
    console.log('✅ Server running on port 3001\n');
  } catch {
    console.log('❌ Server not running. Start it first.');
    process.exit(1);
  }

  // Start localtunnel
  console.log('🔗 Creating secure tunnel...');
  
  try {
    const lt = require('localtunnel');
    const tunnel = await lt({ port: 3001, subdomain: 'fin' + Math.random().toString(36).slice(2, 8) });
    const url = tunnel.url;
    
    console.log('');
    console.log('╔══════════════════════════════════════════════════╗');
    console.log('║         🚀  FINANCIA SAAS - EN VIVO            ║');
    console.log('╠══════════════════════════════════════════════════╣');
    console.log('║                                                  ║');
    console.log(`║  📱  ${url}         ║`);
    console.log('║                                                  ║');
    console.log('║  🔑  Credenciales demo:                         ║');
    console.log('║  📧  demo@financia.app                          ║');
    console.log('║  🔐  demo1234                                    ║');
    console.log('║                                                  ║');
    console.log('║  ⚠️  PRIMERA VEZ: Abre en tu navegador          ║');
    console.log('║     y haz clic en "Click to Continue"           ║');
    console.log('║                                                  ║');
    console.log('║  💡  La app es PWA: Instálala en tu celular     ║');
    console.log('║     Menú → "Instalar aplicación"                ║');
    console.log('║                                                  ║');
    console.log('╚══════════════════════════════════════════════════╝');
    console.log('');
    console.log('🛑  Presiona Ctrl+C para detener el servidor');
    console.log('');

    // Keep alive
    tunnel.on('close', () => {
      console.log('⚠️  Tunnel closed. Restart this script to create a new one.');
      process.exit(1);
    });

  } catch (e) {
    console.log('❌ Tunnel failed:', e.message);
    console.log('');
    console.log('   Access locally: http://localhost:3001');
    console.log('   Or from local network using your LAN IP.');
    process.exit(1);
  }
}

main().catch(console.error);
