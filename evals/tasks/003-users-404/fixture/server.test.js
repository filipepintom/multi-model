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
      await fetch(`${base}/users/1`);
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  throw new Error('servidor não arrancou');
});

after(() => child && child.kill());

test('devolve um utilizador existente', async () => {
  const res = await fetch(`${base}/users/1`);
  assert.strictEqual(res.status, 200);
  assert.strictEqual((await res.json()).name, 'Ana Silva');
});
