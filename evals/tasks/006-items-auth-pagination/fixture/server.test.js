const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { spawn } = require('node:child_process');
const net = require('node:net');

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
  child = spawn(process.execPath, ['server.js'], { env: { ...process.env, PORT: String(port) }, stdio: 'ignore' });
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

test('GET /items devolve todos os artigos', async () => {
  const res = await fetch(`${base}/items`);
  assert.strictEqual(res.status, 200);
  const items = await res.json();
  assert.strictEqual(items.length, 45);
  assert.strictEqual(items[0].id, 1);
});
