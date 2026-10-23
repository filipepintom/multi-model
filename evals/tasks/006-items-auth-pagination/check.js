// Check escondido: copiado para o workspace só depois do agente terminar.
const assert = require('assert');
const fs = require('fs');
const net = require('net');
const { spawn, spawnSync } = require('child_process');

const TOKEN = 'tok-eval-7f3a';

function freePort() {
  return new Promise((resolve) => {
    const s = net.createServer().listen(0, () => {
      const { port } = s.address();
      s.close(() => resolve(port));
    });
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(base, p, headers) {
  const res = await fetch(base + p, { headers });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = undefined; }
  return { status: res.status, json, text };
}

const ids = (r) => r.json.items.map((i) => i.id);
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

(async () => {
  const port = await freePort();
  const base = `http://127.0.0.1:${port}`;
  const auth = { Authorization: `Bearer ${TOKEN}` };
  let exited = false;
  let log = '';
  const child = spawn(process.execPath, ['server.js'], {
    env: { ...process.env, PORT: String(port), API_TOKEN: TOKEN },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.on('data', (d) => { log += d; });
  child.stderr.on('data', (d) => { log += d; });
  child.on('exit', () => { exited = true; });

  try {
    let up = false;
    for (let i = 0; i < 100 && !up && !exited; i++) {
      try { await fetch(`${base}/items`); up = true; } catch { await sleep(100); }
    }
    assert.ok(up, `o servidor não arrancou com "node server.js" e PORT=${port}\n${log}`);

    // autenticação
    const bad = [
      ['sem cabeçalho', undefined],
      ['token errado', { Authorization: 'Bearer outro-token' }],
      ['esquema errado', { Authorization: `Basic ${TOKEN}` }],
      ['token sem esquema', { Authorization: TOKEN }],
      ['Bearer vazio', { Authorization: 'Bearer ' }],
      ['token com sufixo', { Authorization: `Bearer ${TOKEN}x` }],
    ];
    for (const [name, headers] of bad) {
      for (const q of ['', '?page=1&limit=5']) {
        const r = await get(base, `/items${q}`, headers);
        assert.strictEqual(r.status, 401, `${name} em /items${q} devia dar 401, veio ${r.status}`);
        assert.ok(r.json && r.json.error, `${name}: 401 devia ter JSON {error}, veio: ${r.text}`);
      }
    }

    // por omissão
    let r = await get(base, '/items', auth);
    assert.strictEqual(r.status, 200, `/items com token devia dar 200, veio ${r.status}: ${r.text}`);
    assert.ok(r.json && !Array.isArray(r.json), 'a resposta devia ser um objeto, não um array');
    assert.ok(Array.isArray(r.json.items), 'items devia ser um array');
    assert.deepStrictEqual(ids(r), range(1, 10), 'por omissão devolve os artigos 1..10');
    assert.strictEqual(r.json.page, 1, 'page por omissão = 1');
    assert.strictEqual(r.json.limit, 10, 'limit por omissão = 10');
    assert.strictEqual(r.json.total, 45, 'total = 45');
    assert.ok(typeof r.json.items[0].name === 'string', 'os artigos mantêm os seus campos');

    // páginas
    r = await get(base, '/items?page=2', auth);
    assert.strictEqual(r.status, 200);
    assert.deepStrictEqual(ids(r), range(11, 20), 'page=2');
    assert.strictEqual(r.json.page, 2);
    assert.strictEqual(r.json.limit, 10);

    r = await get(base, '/items?page=2&limit=20', auth);
    assert.deepStrictEqual(ids(r), range(21, 40), 'page=2&limit=20');
    assert.strictEqual(r.json.limit, 20);
    assert.strictEqual(r.json.total, 45);

    r = await get(base, '/items?limit=5', auth);
    assert.deepStrictEqual(ids(r), range(1, 5), 'limit=5');
    assert.strictEqual(r.json.page, 1);

    // última página parcial
    r = await get(base, '/items?page=5', auth);
    assert.strictEqual(r.status, 200);
    assert.deepStrictEqual(ids(r), range(41, 45), 'última página parcial');
    assert.strictEqual(r.json.total, 45);

    r = await get(base, '/items?page=3&limit=20', auth);
    assert.deepStrictEqual(ids(r), range(41, 45), 'última página parcial com limit=20');

    // página para lá do fim: 200 e items vazio
    for (const q of ['page=6', 'page=100', 'page=2&limit=50']) {
      r = await get(base, `/items?${q}`, auth);
      assert.strictEqual(r.status, 200, `/items?${q} devia dar 200, veio ${r.status}`);
      assert.deepStrictEqual(r.json.items, [], `/items?${q} devia ter items vazio`);
      assert.strictEqual(r.json.total, 45, `/items?${q} devia manter total`);
    }
    r = await get(base, '/items?page=100', auth);
    assert.strictEqual(r.json.page, 100, 'page devolvido é o pedido');

    // limite máximo
    r = await get(base, '/items?limit=50', auth);
    assert.strictEqual(r.status, 200, 'limit=50 é válido');
    assert.deepStrictEqual(ids(r), range(1, 45), 'limit=50 devolve os 45');
    assert.strictEqual(r.json.limit, 50);

    r = await get(base, '/items?limit=1&page=45', auth);
    assert.deepStrictEqual(ids(r), [45], 'limit=1&page=45');

    // inválidos -> 400
    const invalid = ['page=0', 'page=-1', 'page=abc', 'page=1.5', 'limit=0', 'limit=-5', 'limit=abc', 'limit=2.5', 'limit=51', 'limit=1000', 'page=1&limit=51', 'page=0&limit=10'];
    for (const q of invalid) {
      r = await get(base, `/items?${q}`, auth);
      assert.strictEqual(r.status, 400, `/items?${q} devia dar 400, veio ${r.status}: ${r.text}`);
      assert.ok(r.json && r.json.error, `/items?${q}: 400 devia ter JSON {error}, veio: ${r.text}`);
    }

    // o servidor continua vivo
    assert.ok(!exited, `o servidor terminou durante os pedidos\n${log}`);
    r = await get(base, '/items?page=1&limit=3', auth);
    assert.deepStrictEqual(ids(r), [1, 2, 3]);
  } finally {
    child.kill();
  }

  // testes: têm de existir e passar
  const testFiles = findTestFiles('.');
  assert.ok(testFiles.length > 0, 'não existem ficheiros de teste');
  const allTests = testFiles.map((f) => fs.readFileSync(f, 'utf8')).join('\n');
  assert.ok(/401/.test(allTests), 'os testes não cobrem o caso 401');
  assert.ok(/400/.test(allTests), 'os testes não cobrem o caso 400');
  assert.ok(/limit/.test(allTests) && /page/.test(allTests), 'os testes não cobrem a paginação');
  const t = spawnSync('npm test', { shell: true, encoding: 'utf8', timeout: 50000 });
  assert.strictEqual(t.status, 0, `npm test falhou:\n${t.stdout}\n${t.stderr}`);
  console.log('ok');
})().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});

// Procura ficheiros de teste em todo o projeto (não só na raiz): pastas como test/ são legítimas.
function findTestFiles(dir) {
  const fs = require('fs');
  const path = require('path');
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.git', '.claude', 'docs'].includes(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...findTestFiles(p));
    else if (/\.test\.js$/.test(e.name) || /^test.*\.js$/.test(e.name)) out.push(p);
  }
  return out;
}
