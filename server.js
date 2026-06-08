const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 34927;
const PUBLIC_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  // Naplózzuk a kéréseket, így pm2 logs segítségével könnyen debugolható a forgalom
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);

  // Biztonsági szűrés: ne lehessen könyvtárból kilépni (directory traversal)
  let safeUrl = path.normalize(req.url).replace(/^(\.\.[\/\\])+/, '');
  if (safeUrl === '\\' || safeUrl === '/') {
    safeUrl = '/index.html';
  }

  let filePath = path.join(PUBLIC_DIR, safeUrl);

  // Ellenőrizzük, hogy a feloldott útvonal még mindig a nyilvános mappán belül van-e
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Hozzáférés megtagadva (403)');
    return;
  }

  const ext = path.extname(filePath);
  let contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // Ha a fájl nem létezik, és kiterjesztés nélküli útvonal (SPA), próbáljuk az index.html-t kiszolgálni
        if (!ext) {
          fs.readFile(path.join(PUBLIC_DIR, 'index.html'), (err2, content2) => {
            if (err2) {
              res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
              res.end('Az oldal nem található (404)');
            } else {
              res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
              res.end(content2, 'utf-8');
            }
          });
        } else {
          res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('A kért fájl nem található (404)');
        }
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end(`Szerver hiba (500): ${err.code}`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log(`Static server running on port ${PORT}`);
  console.log(`Serving files from: ${PUBLIC_DIR}`);
});
