// Check escondido: copiado para o workspace só depois do agente terminar.
const assert = require('assert');
const fs = require('fs');
const net = require('net');
const path = require('path');
const { spawn, execSync } = require('child_process');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const running = new Set();

function freePort() {
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.on('error', reject);
    s.listen(0, '127.0.0.1', () => {
      const { port } = s.address();
      s.close(() => resolve(port));
    });
  });
}

async function startServer() {
  assert.ok(fs.existsSync('server.js'), 'falta server.js na raiz');
  const port = await freePort();
  const child = spawn(process.execPath, ['server.js'], {
    cwd: process.cwd(),
    env: { ...process.env, PORT: String(port) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const srv = { output: '', exited: false, base: `http://127.0.0.1:${port}` };
  child.stdout.on('data', (d) => { srv.output += d; });
  child.stderr.on('data', (d) => { srv.output += d; });
  child.on('exit', () => { srv.exited = true; });
  running.add(child);
  srv.stop = () => child.kill();
  const deadline = Date.now() + 15000;
  for (;;) {
    if (srv.exited) throw new Error('o servidor terminou ao arrancar:\n' + srv.output.slice(-1500));
    try {
      await fetch(srv.base + '/customers', { signal: AbortSignal.timeout(1000) });
      break;
    } catch {
      if (Date.now() > deadline) throw new Error('o servidor não respondeu em 15 s:\n' + srv.output.slice(-1500));
      await sleep(100);
    }
  }
  return srv;
}

const STACK_LINE = /\n\s+at\s|\bat\s+[^\n(]*\([^\n)]*:\d+:\d+\)|\.js:\d+:\d+|node:internal/;

let srv;

// body: objeto (enviado como JSON), string (enviada tal como está) ou undefined
async function call(method, url, body) {
  assert.ok(!srv.exited, `o servidor caiu antes de ${method} ${url}:\n${srv.output.slice(-800)}`);
  let res;
  try {
    res = await fetch(srv.base + url, {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    });
  } catch (e) {
    await sleep(200);
    throw new Error(`${method} ${url} falhou (${e.message}); servidor ${srv.exited ? 'caiu' : 'ativo'}:\n${srv.output.slice(-800)}`);
  }
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { /* texto */ }
  return { status: res.status, headers: res.headers, text, json, label: `${method} ${url}` };
}

function expectError(r, status, code) {
  const ctx = `${r.label} -> ${r.status} ${r.text.slice(0, 200)}`;
  assert.strictEqual(r.status, status, `${r.label}: esperado status ${status}\n  resposta: ${ctx}`);
  assert.match(r.headers.get('content-type') || '', /application\/json/i, `${r.label}: Content-Type deve ser application/json`);
  assert.ok(r.json && typeof r.json === 'object' && !Array.isArray(r.json), `${r.label}: o corpo deve ser JSON (recebido: ${r.text.slice(0, 200)})`);
  assert.ok(r.json.error && typeof r.json.error === 'object', `${r.label}: o corpo deve ter { error: { code, message } } (recebido: ${r.text.slice(0, 200)})`);
  assert.strictEqual(r.json.error.code, code, `${r.label}: esperado code ${code}, recebido ${r.json.error.code}`);
  assert.ok(typeof r.json.error.message === 'string' && r.json.error.message.trim(), `${r.label}: error.message deve ser texto não vazio`);
  assert.ok(!('stack' in r.json) && !('stack' in r.json.error), `${r.label}: a resposta não pode ter "stack"`);
  assert.ok(!STACK_LINE.test(r.text), `${r.label}: a resposta parece conter um stack trace: ${r.text.slice(0, 300)}`);
}

async function main() {
  srv = await startServer();

  // ---- caminhos de sucesso: iguais ao que já existia
  let r = await call('GET', '/customers');
  assert.strictEqual(r.status, 200);
  assert.deepStrictEqual(r.json, [{ id: 1, name: 'Alice', email: 'alice@example.com' }], 'GET /customers');
  r = await call('GET', '/customers/1');
  assert.strictEqual(r.status, 200);
  assert.deepStrictEqual(r.json, { id: 1, name: 'Alice', email: 'alice@example.com' }, 'GET /customers/1');
  r = await call('POST', '/customers', { name: 'Bob', email: 'bob@example.com' });
  assert.strictEqual(r.status, 201, 'POST /customers válido deve dar 201');
  assert.deepStrictEqual(r.json, { id: 2, name: 'Bob', email: 'bob@example.com' }, 'POST /customers');

  r = await call('GET', '/products');
  assert.strictEqual(r.status, 200);
  assert.deepStrictEqual(r.json.map((p) => p.id), [1, 2, 99], 'GET /products');
  r = await call('GET', '/products/1');
  assert.strictEqual(r.status, 200);
  assert.deepStrictEqual(r.json, { id: 1, name: 'Widget', sku: 'W-1', price: 9.99 }, 'GET /products/1');
  r = await call('POST', '/products', { name: 'Doohickey', sku: 'D-1', price: 5 });
  assert.strictEqual(r.status, 201, 'POST /products válido deve dar 201');
  assert.strictEqual(r.json.name, 'Doohickey');
  assert.strictEqual(r.json.sku, 'D-1');
  assert.strictEqual(r.json.price, 5);
  assert.strictEqual(typeof r.json.id, 'number');

  r = await call('POST', '/orders', { customerId: 1, productId: 1, quantity: 2 });
  assert.strictEqual(r.status, 201, 'POST /orders válido deve dar 201');
  assert.deepStrictEqual(r.json, { id: 1, customerId: 1, productId: 1, quantity: 2, unitPrice: 9.99, total: 19.98 }, 'POST /orders');
  r = await call('GET', '/orders/1');
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.json.total, 19.98, 'GET /orders/1');
  r = await call('GET', '/orders');
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.json.length, 1, 'GET /orders');

  // ---- 400 VALIDATION_ERROR
  expectError(await call('POST', '/customers', {}), 400, 'VALIDATION_ERROR');
  expectError(await call('POST', '/customers', { name: 'Sem Email' }), 400, 'VALIDATION_ERROR');
  expectError(await call('POST', '/customers', { name: 'Mau', email: 'isto-nao-e-email' }), 400, 'VALIDATION_ERROR');
  expectError(await call('POST', '/customers', { name: 123, email: 'a@b.pt' }), 400, 'VALIDATION_ERROR');
  expectError(await call('POST', '/products', { name: '', sku: 'Z-1', price: 1 }), 400, 'VALIDATION_ERROR');
  expectError(await call('POST', '/products', { name: 'Z', sku: 'Z-1', price: -1 }), 400, 'VALIDATION_ERROR');
  expectError(await call('POST', '/products', { name: 'Z', sku: 'Z-1', price: 'caro' }), 400, 'VALIDATION_ERROR');
  expectError(await call('POST', '/orders', { customerId: 1, productId: 1, quantity: 0 }), 400, 'VALIDATION_ERROR');
  expectError(await call('POST', '/orders', { customerId: 1, productId: 1, quantity: 1.5 }), 400, 'VALIDATION_ERROR');
  expectError(await call('POST', '/orders', { productId: 1, quantity: 1 }), 400, 'VALIDATION_ERROR');

  // ---- 400 INVALID_JSON (na versão original, em /orders o processo caía)
  for (const url of ['/customers', '/products', '/orders']) {
    expectError(await call('POST', url, '{"name": '), 400, 'INVALID_JSON');
    expectError(await call('POST', url, 'isto não é json'), 400, 'INVALID_JSON');
  }
  r = await call('GET', '/customers/1');
  assert.strictEqual(r.status, 200, 'o servidor deve continuar a responder depois de JSON inválido');

  // ---- 404 NOT_FOUND
  expectError(await call('GET', '/customers/999'), 404, 'NOT_FOUND');
  expectError(await call('GET', '/products/999'), 404, 'NOT_FOUND');
  expectError(await call('GET', '/orders/999'), 404, 'NOT_FOUND');
  expectError(await call('GET', '/rota/que/nao/existe'), 404, 'NOT_FOUND');
  expectError(await call('POST', '/orders', { customerId: 999, productId: 1, quantity: 1 }), 404, 'NOT_FOUND');
  expectError(await call('POST', '/orders', { customerId: 1, productId: 999, quantity: 1 }), 404, 'NOT_FOUND');

  // ---- 409 CONFLICT
  expectError(await call('POST', '/customers', { name: 'Alice 2', email: 'alice@example.com' }), 409, 'CONFLICT');
  expectError(await call('POST', '/products', { name: 'Outro Widget', sku: 'W-1', price: 3 }), 409, 'CONFLICT');
  r = await call('GET', '/customers');
  assert.strictEqual(r.json.length, 2, 'um conflito não pode criar o cliente duplicado');

  // ---- 500 INTERNAL_ERROR (produto 99 sem preço) + log no servidor
  const logBefore = srv.output.length;
  const e1 = await call('GET', '/products/99');
  expectError(e1, 500, 'INTERNAL_ERROR');
  const e2 = await call('POST', '/orders', { customerId: 1, productId: 99, quantity: 1 });
  expectError(e2, 500, 'INTERNAL_ERROR');
  for (const e of [e1, e2]) {
    assert.ok(!/toFixed|TypeError|Cannot read|null/i.test(e.json.error.message),
      `${e.label}: a mensagem do INTERNAL_ERROR não deve expor o erro interno (${e.json.error.message})`);
    assert.ok(!/toFixed|TypeError|Cannot read/.test(e.text), `${e.label}: a resposta não deve expor detalhes internos`);
  }
  await sleep(300);
  assert.ok(srv.output.length > logBefore, 'os erros inesperados (500) têm de ser registados em stdout/stderr no servidor');

  // ---- o servidor sobreviveu a tudo e continua a funcionar
  assert.ok(!srv.exited, 'o servidor caiu');
  r = await call('GET', '/customers/1');
  assert.strictEqual(r.status, 200);
  assert.deepStrictEqual(r.json, { id: 1, name: 'Alice', email: 'alice@example.com' });
  r = await call('POST', '/orders', { customerId: 1, productId: 2, quantity: 3 });
  assert.strictEqual(r.status, 201);
  assert.strictEqual(r.json.total, 73.5);

  srv.stop();
  await sleep(200);

  // ---- testes existentes continuam a passar (e não foram apagados)
  function walk(d, out = []) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (e.name === 'node_modules' || e.name === '.git') continue;
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p, out);
      else out.push(p);
    }
    return out;
  }
  const isTest = (f) => /(\.test\.[cm]?js|[-_.]test\.js)$/.test(f) || /(^|[\\/])tests?[\\/][^\\/]+\.[cm]?js$/.test(f);
  const countCases = (s) => (s.match(/\b(?:test|it)\s*\(/g) || []).length;
  const nowCases = walk('.').filter((f) => isTest(f.replace(/^\.[\\/]/, ''))).map((f) => countCases(fs.readFileSync(f, 'utf8'))).reduce((a, b) => a + b, 0);
  let originalCases = null;
  try {
    const root = execSync('git rev-list --max-parents=0 HEAD', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim().split('\n')[0];
    const files = execSync(`git ls-tree -r --name-only ${root}`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).split('\n').filter(isTest);
    originalCases = files.map((f) => countCases(execSync(`git show ${root}:${f}`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }))).reduce((a, b) => a + b, 0);
  } catch { /* sem git: ignora esta verificação */ }
  if (originalCases) {
    assert.ok(nowCases >= originalCases, `os testes existentes não podem ser apagados (antes ${originalCases}, agora ${nowCases})`);
  }
  assert.ok(nowCases > 0, 'não há testes');
  execSync('npm test', { stdio: 'inherit', timeout: 80000 });
  console.log('ok');
}

main().then(
  () => { for (const c of running) c.kill(); process.exit(0); },
  (e) => { console.error(e && e.stack ? e.stack : e); for (const c of running) c.kill(); process.exit(1); },
);
