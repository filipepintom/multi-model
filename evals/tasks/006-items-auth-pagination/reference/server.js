const http = require('http');

const items = Array.from({ length: 45 }, (_, i) => ({
  id: i + 1,
  name: `Artigo ${i + 1}`,
  price: Math.round((5 + i * 1.7) * 100) / 100,
}));

const TOKEN = process.env.API_TOKEN;

function send(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

function parsePositiveInt(raw, def) {
  if (raw === null) return def;
  if (!/^\d+$/.test(raw)) return NaN;
  const n = Number(raw);
  return n >= 1 ? n : NaN;
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (req.method === 'GET' && url.pathname === '/items') {
    if (!TOKEN || req.headers.authorization !== `Bearer ${TOKEN}`) {
      return send(res, 401, { error: 'unauthorized' });
    }
    const page = parsePositiveInt(url.searchParams.get('page'), 1);
    const limit = parsePositiveInt(url.searchParams.get('limit'), 10);
    if (Number.isNaN(page) || Number.isNaN(limit) || limit > 50) {
      return send(res, 400, { error: 'invalid page or limit' });
    }
    const start = (page - 1) * limit;
    return send(res, 200, { items: items.slice(start, start + limit), page, limit, total: items.length });
  }
  send(res, 404, { error: 'not found' });
});

server.listen(process.env.PORT || 3000, () => {
  console.log(`catalog-service a escutar na porta ${server.address().port}`);
});
