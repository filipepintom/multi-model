const http = require('http');

const users = [
  { id: 1, name: 'Ana Silva', email: 'ana@example.com' },
  { id: 2, name: 'Bruno Costa', email: 'bruno@example.com' },
  { id: 3, name: 'Carla Mendes', email: 'carla@example.com' },
];

const server = http.createServer((req, res) => {
  const match = req.method === 'GET' && /^\/users\/([^/]+)$/.exec(req.url.split('?')[0]);
  if (!match) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'not found' }));
    return;
  }
  const id = JSON.parse(match[1]);
  const user = users.find((u) => u.id === id);
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(user || null));
});

server.listen(process.env.PORT || 3000, () => {
  console.log(`users-service a escutar na porta ${server.address().port}`);
});
