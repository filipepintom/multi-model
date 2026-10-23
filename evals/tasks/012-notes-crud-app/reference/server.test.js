const test = require('node:test');
const assert = require('node:assert');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const net = require('node:net');
const path = require('node:path');

function freePort() {
  return new Promise((resolve) => {
    const s = net.createServer().listen(0, () => {
      const { port } = s.address();
      s.close(() => resolve(port));
    });
  });
}

async function start(dataFile) {
  const port = await freePort();
  const child = spawn(process.execPath, ['server.js'], { env: { ...process.env, PORT: String(port), DATA_FILE: dataFile }, stdio: 'ignore' });
  const base = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 100; i++) {
    try { await fetch(base + '/'); break; } catch { await new Promise((r) => setTimeout(r, 50)); }
  }
  return { base, stop: () => child.kill() };
}

const json = (base, method, url, body, raw) => fetch(base + url, {
  method,
  headers: { 'Content-Type': 'application/json' },
  body: raw ?? (body === undefined ? undefined : JSON.stringify(body)),
});

test('CRUD completo, validações e 404', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'notas-'));
  const srv = await start(path.join(dir, 'data.json'));
  try {
    let res = await json(srv.base, 'POST', '/api/notes', { title: 'Olá', body: 'mundo' });
    assert.strictEqual(res.status, 201);
    const note = await res.json();
    assert.strictEqual(note.title, 'Olá');

    res = await json(srv.base, 'GET', '/api/notes/' + note.id);
    assert.strictEqual(res.status, 200);

    res = await json(srv.base, 'PUT', '/api/notes/' + note.id, { title: 'Novo', body: '' });
    assert.strictEqual((await res.json()).title, 'Novo');

    res = await json(srv.base, 'POST', '/api/notes', { title: '' });
    assert.strictEqual(res.status, 400);
    res = await json(srv.base, 'POST', '/api/notes', { title: 'x'.repeat(101) });
    assert.strictEqual(res.status, 400);
    res = await json(srv.base, 'POST', '/api/notes', undefined, '{nao json');
    assert.strictEqual(res.status, 400);

    res = await json(srv.base, 'GET', '/api/notes/nao-existe');
    assert.strictEqual(res.status, 404);

    res = await json(srv.base, 'DELETE', '/api/notes/' + note.id);
    assert.strictEqual(res.status, 204);
    res = await json(srv.base, 'GET', '/api/notes/' + note.id);
    assert.strictEqual(res.status, 404);
  } finally {
    srv.stop();
  }
});

test('as notas persistem entre reinícios', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'notas-'));
  const file = path.join(dir, 'data.json');
  let srv = await start(file);
  let id;
  try {
    id = (await (await json(srv.base, 'POST', '/api/notes', { title: 'Persistente' })).json()).id;
  } finally {
    srv.stop();
  }
  srv = await start(file);
  try {
    const list = await (await json(srv.base, 'GET', '/api/notes')).json();
    assert.ok(list.some((n) => n.id === id && n.title === 'Persistente'));
  } finally {
    srv.stop();
  }
});

test('GET / devolve HTML com formulário', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'notas-'));
  const srv = await start(path.join(dir, 'data.json'));
  try {
    const res = await fetch(srv.base + '/');
    assert.match(res.headers.get('content-type'), /html/);
    assert.match(await res.text(), /<form/i);
  } finally {
    srv.stop();
  }
});
