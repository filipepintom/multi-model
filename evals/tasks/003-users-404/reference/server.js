const http = require('http');

const users = [
  { id: 1, name: 'Ana Silva', email: 'ana@example.com' },
  { id: 2, name: 'Bruno Costa', email: 'bruno@example.com' },
  { id: 3, name: 'Carla Mendes', email: 'carla@example.com' },
];

function send(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

const server = http.createServer((req, res) => {
  const match = req.method === 'GET' && /^\/users\/([^/]+)$/.exec(req.url.split('?')[0]);
  if (!match) return send(res, 404, { error: 'not found' });
  if (!/^\d+$/.test(match[1])) return send(res, 400, { error: 'invalid id' });
  const id = Number(match[1]);
  const user = users.find((u) => u.id === id);
  if (!user) return send(res, 404, { error: 'user not found' });
  send(res, 200, user);
});

server.listen(process.env.PORT || 3000, () => {
  console.log(`users-service a escutar na porta ${server.address().port}`);
});
