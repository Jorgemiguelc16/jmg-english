// Servidor local mínimo para JMG English (sin dependencias).
// Lo inicia "Abrir JMG English.bat". El puerto debe quedarse fijo:
// tu progreso se guarda por dirección (http://localhost:5180).
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 5180;
const ROOT = __dirname;
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
};

const server = http.createServer((req, res) => {
  let p;
  try { p = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); } catch { res.writeHead(400); return res.end(); }
  if (p === '/') p = '/index.html';
  const file = path.normalize(path.join(ROOT, p));
  if (!file.startsWith(ROOT + path.sep)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end('No encontrado'); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(data);
  });
});

server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') console.log(`JMG English ya está abierto en http://localhost:${PORT}`);
  else console.error(e);
  process.exit(0);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`JMG English funcionando en http://localhost:${PORT}`);
  console.log('Puedes minimizar esta ventana. Ciérrala cuando termines de estudiar.');
});
