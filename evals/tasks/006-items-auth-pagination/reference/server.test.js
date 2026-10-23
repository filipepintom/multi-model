const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { spawn } = require('node:child_process');
const net = require('node:net');

const TOKEN = 'segredo-de-teste';
const auth = { Authorization: `Bearer ${TOKEN}` };
let child;
let base;

function freePort() {
  return new Promise((resolve) => {
    const s = net.createServer().listen(0, () => {
      const { port } = s.address();
      s.close(() => resolve(port));
    });
  });
}

before(async () => {
  const port = await freePort();
  base = `http://127.0.0.1:${port}`;
  child = spawn(process.execPath, ['server.js'], { env: { ...process.env, PORT: String(port), API_TOKEN: TOKEN }, stdio: 'ignore' });
  for (let i = 0; i < 50; i++) {
    try {
      await fetch(`${base}/items`);
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  throw new Error('servidor não arrancou');
});

after(() => child && child.kill());

test('sem token devolve 401', async () => {
  assert.strictEqual((await fetch(`${base}/items`)).status, 401);
  assert.strictEqual((await fetch(`${base}/items`, { headers: { Authorization: 'Bearer errado' } })).status, 401);
});

test('por omissão devolve a primeira página de 10', async () => {
  const res = await fetch(`${base}/items`, { headers: auth });
  assert.strictEqual(res.status, 200);
  const body = await res.json();
  assert.strictEqual(body.items.length, 10);
  assert.deepStrictEqual([body.page, body.limit, body.total], [1, 10, 45]);
  assert.strictEqual(body.items[0].id, 1);
});

test('última página parcial e página para lá do fim', async () => {
  const last = await (await fetch(`${base}/items?page=5`, { headers: auth })).json();
  assert.strictEqual(last.items.length, 5);
  const beyond = await fetch(`${base}/items?page=6`, { headers: auth });
  assert.strictEqual(beyond.status, 200);
  assert.deepStrictEqual((await beyond.json()).items, []);
});

test('page e limit inválidos devolvem 400', async () => {
  for (const q of ['page=0', 'page=abc', 'limit=0', 'limit=51', 'limit=2.5']) {
    assert.strictEqual((await fetch(`${base}/items?${q}`, { headers: auth })).status, 400, q);
  }
});
