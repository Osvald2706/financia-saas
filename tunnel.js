const lt = require('localtunnel');
const id = process.argv[2] || 'financia' + Math.random().toString(36).slice(2, 8);
(async () => {
  try {
    const tunnel = await lt({ port: 3001, subdomain: id });
    console.log('TUNNEL_URL:' + tunnel.url);
    tunnel.on('close', () => console.log('Tunnel closed'));
    setInterval(() => {}, 1 << 30);
  } catch (e) {
    console.log('TUNNEL_ERROR:' + e.message);
  }
})();
