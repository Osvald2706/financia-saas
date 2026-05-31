const { spawn } = require('child_process');
const path = require('path');

const serverDir = path.join(__dirname, 'server');
const BUILD_DONE = path.join(__dirname, 'client', 'dist', 'index.html');

console.log('');
console.log('╔══════════════════════════════════════════╗');
console.log('║     FINANCIA - Starting...               ║');
console.log('╚══════════════════════════════════════════╝');
console.log('');

const fs = require('fs');
if (!fs.existsSync(BUILD_DONE)) {
  console.log('📦 Building frontend...');
  require('child_process').execSync('npx vite build', { cwd: path.join(__dirname, 'client'), stdio: 'inherit' });
  console.log('✅ Frontend built!\n');
}

console.log('🚀 Starting server...');
const server = spawn('npx', ['tsx', 'src/index.ts'], {
  cwd: serverDir,
  stdio: ['ignore', 'pipe', 'pipe'],
  shell: true,
});

server.stdout.on('data', (data) => process.stdout.write(data));
server.stderr.on('data', (data) => process.stderr.write(data));

setTimeout(async () => {
  // Check server health
  const http = require('http');
  const check = () => new Promise((resolve, reject) => {
    const req = http.get('http://localhost:3001/api/health', (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve(d));
    });
    req.on('error', reject);
    req.setTimeout(3000, () => { req.destroy(); reject(new Error('timeout')); });
  });

  try {
    const health = await check();
    console.log(`✅ Server: ${health}\n`);
  } catch (e) {
    console.log('❌ Server failed to start');
    process.exit(1);
  }

  // Start tunnel
  console.log('🔗 Creating public tunnel...\n');

  try {
    const lt = require('localtunnel');
    const tunnel = await lt({ port: 3001 });
    const url = tunnel.url;

    console.log('');
    console.log('╔══════════════════════════════════════════════════╗');
    console.log('║         🚀  FINANCIA SAAS - EN VIVO            ║');
    console.log('╠══════════════════════════════════════════════════╣');
    console.log('║                                                  ║');
    console.log(`║  📱  ${url.padEnd(47)}║`);
    console.log('║                                                  ║');
    console.log('║  🔑  Demo:  demo@financia.app                   ║');
    console.log('║  🔐  Pass:  demo1234                            ║');
    console.log('║                                                  ║');
    console.log('║  ⚠️  PRIMERA VEZ: Abre la URL en tu navegador   ║');
    console.log('║     y haz clic en "Click to Continue"            ║');
    console.log('║                                                  ║');
    console.log('║  💡  INSTALAR COMO APP:                         ║');
    console.log('║  Android: Chrome → Menú → Instalar aplicación   ║');
    console.log('║  iPhone:  Safari → Compartir → Pantalla Inicio  ║');
    console.log('║  PC:      Chrome → icono 🔒 → Instalar          ║');
    console.log('║                                                  ║');
    console.log('╚══════════════════════════════════════════════════╝');
    console.log('');

    tunnel.on('close', () => {
      console.log('⚠️ Tunnel closed. Financia continues locally at http://localhost:3001');
    });

  } catch (e) {
    console.log('⚠️ Tunnel unavailable. Access locally: http://localhost:3001');
    console.log(`   Error: ${e.message}`);
  }

  console.log('🛑  Press Ctrl+C to stop the server');
  console.log('');
}, 5000);

process.on('SIGINT', () => {
  console.log('\nShutting down...');
  server.kill();
  process.exit(0);
});
