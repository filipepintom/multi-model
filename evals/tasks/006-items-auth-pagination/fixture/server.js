const http = require('http');

const items = Array.from({ length: 45 }, (_, i) => ({
  id: i + 1,
  name: `Artigo ${i + 1}`,
  price: Math.round((5 + i * 1.7) * 100) / 100,
}));

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (req.method === 'GET' && url.pathname === '/items') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(items));
    return;
  }
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'not found' }));
});

server.listen(process.env.PORT || 3000, () => {
  console.log(`catalog-service a escutar na porta ${server.address().port}`);
});
