// Check escondido: copiado para o workspace só depois do agente terminar.
const assert = require('assert');
const fs = require('fs');
const net = require('net');
const { spawn, spawnSync } = require('child_process');

function freePort() {
  return new Promise((resolve) => {
    const s = net.createServer().listen(0, () => {
      const { port } = s.address();
      s.close(() => resolve(port));
    });
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(base, p) {
  const res = await fetch(base + p);
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = undefined; }
  return { status: res.status, json, text };
}

(async () => {
  const port = await freePort();
  const base = `http://127.0.0.1:${port}`;
  let exited = false;
  let log = '';
  const child = spawn(process.execPath, ['server.js'], { env: { ...process.env, PORT: String(port) }, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.on('data', (d) => { log += d; });
  child.stderr.on('data', (d) => { log += d; });
  child.on('exit', () => { exited = true; });

  try {
    let up = false;
    for (let i = 0; i < 100 && !up && !exited; i++) {
      try { await fetch(`${base}/users/1`); up = true; } catch { await sleep(100); }
    }
    assert.ok(up, `o servidor não arrancou com "node server.js" e PORT=${port}\n${log}`);

    // utilizadores existentes continuam a funcionar
    for (const id of [1, 2, 3]) {
      const r = await get(base, `/users/${id}`);
      assert.strictEqual(r.status, 200, `/users/${id} devia responder 200`);
      assert.ok(r.json && r.json.id === id, `/users/${id} devia devolver o utilizador com id ${id}, veio: ${r.text}`);
      assert.ok(typeof r.json.name === 'string' && r.json.name, `/users/${id} devia ter nome`);
    }

    // id numérico inexistente -> 404
    for (const id of ['999', '4', '100000']) {
      const r = await get(base, `/users/${id}`);
      assert.strictEqual(r.status, 404, `/users/${id} devia responder 404, veio ${r.status}`);
      assert.ok(r.json && typeof r.json === 'object' && 'error' in r.json && r.json.error, `/users/${id} devia ter JSON {error}, veio: ${r.text}`);
    }

    // id inválido -> 400
    for (const id of ['abc', '1x', '1.5', 'x1', 'null', 'true']) {
      const r = await get(base, `/users/${id}`);
      assert.ok(!exited, `o servidor morreu depois de /users/${id}\n${log}`);
      assert.strictEqual(r.status, 400, `/users/${id} devia responder 400, veio ${r.status}`);
      assert.ok(r.json && typeof r.json === 'object' && 'error' in r.json && r.json.error, `/users/${id} devia ter JSON {error}, veio: ${r.text}`);
    }

    // continua vivo e a servir
    assert.ok(!exited, `o servidor terminou depois dos pedidos inválidos\n${log}`);
    const again = await get(base, '/users/2');
    assert.strictEqual(again.status, 200, 'depois dos pedidos inválidos, /users/2 devia continuar a responder 200');
    assert.strictEqual(again.json.id, 2);
  } finally {
    child.kill();
  }

  // testes
  const testFiles = fs.readdirSync('.').filter((f) => /\.test\.js$/.test(f) || /^test.*\.js$/.test(f));
  assert.ok(testFiles.length > 0, 'não existem ficheiros de teste');
  const allTests = testFiles.map((f) => fs.readFileSync(f, 'utf8')).join('\n');
  assert.ok(/404/.test(allTests), 'os testes não cobrem o caso 404');
  assert.ok(/400/.test(allTests), 'os testes não cobrem o caso 400');
  const t = spawnSync('npm test', { shell: true, encoding: 'utf8', timeout: 50000 });
  assert.strictEqual(t.status, 0, `npm test falhou:\n${t.stdout}\n${t.stderr}`);
  console.log('ok');
})().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
