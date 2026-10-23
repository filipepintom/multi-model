// Servidor mínimo para testes manuais: serve os ficheiros estáticos desta pasta e uma API de pesquisa simulada.
//   PORT=3000 node server.js
//
// GET /api/search?q=texto  ->  200 { "results": [ { "id": 1, "name": "..." } ] }
// Truques para testar à mão: q=lento demora 2 s; q=erro responde 500.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const CATALOG = [
  'Maçã', 'Banana', 'Laranja', 'Pêra', 'Morango', 'Melão', 'Melancia', 'Ananás',
  'Uva', 'Kiwi', 'Cereja', 'Pêssego', 'Limão', 'Manga', 'Papaia',
].map((name, i) => ({ id: i + 1, name }));

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };

function send(res, status, body, type = 'application/json; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': type });
  res.end(typeof body === 'string' ? body : JSON.stringify(body));
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/api/search') {
    const q = (url.searchParams.get('q') || '').trim().toLowerCase();
    if (q === 'erro') return send(res, 500, { error: 'falha simulada' });
    const results = CATALOG.filter((item) => item.name.toLowerCase().includes(q));
    const delay = q === 'lento' ? 2000 : 80;
    return void setTimeout(() => send(res, 200, { results }), delay);
  }
  const file = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
  const full = path.join(__dirname, path.normalize(file));
  if (!full.startsWith(__dirname + path.sep) || !fs.existsSync(full) || !fs.statSync(full).isFile()) {
    return send(res, 404, 'Não encontrado', 'text/plain; charset=utf-8');
  }
  send(res, 200, fs.readFileSync(full), TYPES[path.extname(full)] || 'application/octet-stream');
});

server.listen(process.env.PORT || 3000, () => console.log('a ouvir em http://localhost:' + server.address().port));
