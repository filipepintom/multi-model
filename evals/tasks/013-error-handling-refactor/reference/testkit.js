// Utilitários partilhados pelos testes: arranca o servidor numa porta livre e faz pedidos.
const { createServer } = require('./server');
const db = require('./db');

async function withServer(fn) {
  db.reset();
  const server = createServer();
  await new Promise((resolve) => server.listen(0, resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    await fn((method, path, body) => call(base, method, path, body));
  } finally {
    server.closeAllConnections?.();
    await new Promise((resolve) => server.close(resolve));
  }
}

async function call(base, method, path, body) {
  const res = await fetch(base + path, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    // Uma string é enviada tal como está (útil para JSON inválido).
    body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { /* não é JSON */ }
  return { status: res.status, json, text };
}

module.exports = { withServer };
