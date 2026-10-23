// Check escondido: copiado para o workspace só depois do agente terminar.
const assert = require('assert');
const fs = require('fs');
const os = require('os');
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

async function startServer(dataFile) {
  assert.ok(fs.existsSync('server.js'), 'falta server.js na raiz');
  const port = await freePort();
  const child = spawn(process.execPath, ['server.js'], {
    cwd: process.cwd(),
    env: { ...process.env, PORT: String(port), DATA_FILE: dataFile },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  child.stdout.on('data', (d) => { output += d; });
  child.stderr.on('data', (d) => { output += d; });
  let exited = false;
  const exitPromise = new Promise((r) => child.on('exit', () => { exited = true; r(); }));
  running.add(child);
  const base = `http://127.0.0.1:${port}`;
  const deadline = Date.now() + 15000;
  for (;;) {
    if (exited) throw new Error('o servidor terminou ao arrancar:\n' + output.slice(-1500));
    try {
      await fetch(base + '/', { signal: AbortSignal.timeout(1000) });
      break;
    } catch {
      if (Date.now() > deadline) throw new Error('o servidor não respondeu em 15 s na PORT indicada:\n' + output.slice(-1500));
      await sleep(100);
    }
  }
  return {
    base,
    isAlive: () => !exited,
    async stop() {
      if (!exited) child.kill();
      await Promise.race([exitPromise, sleep(5000)]);
      running.delete(child);
    },
  };
}

async function req(base, method, url, { json, raw } = {}) {
  const init = { method, signal: AbortSignal.timeout(10000) };
  if (json !== undefined || raw !== undefined) {
    init.headers = { 'Content-Type': 'application/json' };
    init.body = raw !== undefined ? raw : JSON.stringify(json);
  }
  const res = await fetch(base + url, init);
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch { body = undefined; }
  return { status: res.status, headers: res.headers, text, body };
}

function assertErrorJson(r, status, ctx) {
  assert.strictEqual(r.status, status, `${ctx}: esperado ${status}, recebido ${r.status} (${r.text.slice(0, 200)})`);
  assert.match(r.headers.get('content-type') || '', /application\/json/i, `${ctx}: Content-Type deve ser application/json`);
  assert.ok(r.body && typeof r.body.error === 'string' && r.body.error.length > 0, `${ctx}: corpo deve ser { "error": "mensagem" }, recebido ${r.text.slice(0, 200)}`);
}

function assertNote(n, ctx) {
  assert.ok(n && typeof n === 'object', `${ctx}: nota em falta`);
  assert.strictEqual(typeof n.id, 'string', `${ctx}: id deve ser string`);
  assert.ok(n.id.length > 0, `${ctx}: id vazio`);
  assert.strictEqual(typeof n.title, 'string', `${ctx}: title deve ser string`);
  assert.strictEqual(typeof n.body, 'string', `${ctx}: body deve ser string`);
  for (const k of ['createdAt', 'updatedAt']) {
    assert.strictEqual(typeof n[k], 'string', `${ctx}: ${k} deve ser string ISO`);
    assert.ok(/^\d{4}-\d{2}-\d{2}T/.test(n[k]) && !Number.isNaN(Date.parse(n[k])), `${ctx}: ${k} deve ser data ISO 8601 (${n[k]})`);
  }
}

async function main() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'check-notes-'));
  const dataFile = path.join(dir, 'notes.json');
  assert.ok(!fs.existsSync(dataFile));
  let srv = await startServer(dataFile);

  // ---- página
  {
    const r = await req(srv.base, 'GET', '/');
    assert.strictEqual(r.status, 200, 'GET / deve dar 200');
    assert.match(r.headers.get('content-type') || '', /text\/html/i, 'GET / deve ser HTML');
    assert.match(r.text, /<form[\s>]/i, 'a página deve ter um <form');
    // a página tem de usar a API (diretamente ou através de um script servido pelo próprio servidor)
    let sources = r.text;
    for (const m of r.text.matchAll(/<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi)) {
      if (/^https?:\/\//i.test(m[1])) continue;
      const s = await req(srv.base, 'GET', m[1].startsWith('/') ? m[1] : '/' + m[1].replace(/^\.\//, ''));
      if (s.status === 200) sources += '\n' + s.text;
    }
    assert.ok(/api\/notes/.test(sources), 'a página (ou os seus scripts) deve usar /api/notes');
  }

  // ---- lista vazia
  {
    const r = await req(srv.base, 'GET', '/api/notes');
    assert.strictEqual(r.status, 200);
    assert.ok(Array.isArray(r.body), 'GET /api/notes deve devolver um array');
    assert.strictEqual(r.body.length, 0, 'a lista deve começar vazia');
  }

  // ---- criar
  const created = await req(srv.base, 'POST', '/api/notes', { json: { title: 'Primeira nota ção 😀', body: 'Texto da nota' } });
  assert.strictEqual(created.status, 201, `POST válido deve dar 201 (recebido ${created.status}: ${created.text.slice(0, 200)})`);
  assert.match(created.headers.get('content-type') || '', /application\/json/i, 'POST deve responder JSON');
  const A = created.body;
  assertNote(A, 'POST');
  assert.strictEqual(A.title, 'Primeira nota ção 😀');
  assert.strictEqual(A.body, 'Texto da nota');
  assert.ok(fs.existsSync(dataFile), 'DATA_FILE devia ter sido criado');
  assert.doesNotThrow(() => JSON.parse(fs.readFileSync(dataFile, 'utf8')), 'DATA_FILE deve conter JSON válido');

  const onlyTitle = await req(srv.base, 'POST', '/api/notes', { json: { title: 'Só título' } });
  assert.strictEqual(onlyTitle.status, 201, 'body é opcional');
  assertNote(onlyTitle.body, 'POST sem body');
  assert.strictEqual(onlyTitle.body.body, '', 'sem body assume ""');
  const B = onlyTitle.body;
  assert.notStrictEqual(A.id, B.id, 'ids têm de ser únicos');

  const t100 = await req(srv.base, 'POST', '/api/notes', { json: { title: 'x'.repeat(100), body: '' } });
  assert.strictEqual(t100.status, 201, 'título com exatamente 100 caracteres é válido');
  const C = t100.body;

  // ---- validações do POST
  const bad = [
    ['title em falta', { json: { body: 'x' } }],
    ['title vazio', { json: { title: '', body: 'x' } }],
    ['title só com espaços', { json: { title: '    ', body: 'x' } }],
    ['title com 101 caracteres', { json: { title: 'x'.repeat(101) } }],
    ['title não é string', { json: { title: 123 } }],
    ['body não é string', { json: { title: 'ok', body: 123 } }],
    ['JSON inválido', { raw: '{"title": "abc"' }],
    ['texto que não é JSON', { raw: 'olá mundo' }],
    ['JSON que é um array', { raw: '[]' }],
    ['JSON que é uma string', { raw: '"abc"' }],
    ['JSON null', { raw: 'null' }],
  ];
  for (const [nome, opts] of bad) {
    assertErrorJson(await req(srv.base, 'POST', '/api/notes', opts), 400, `POST com ${nome}`);
  }
  assert.ok(srv.isAlive(), 'o servidor caiu com pedidos inválidos');
  {
    const r = await req(srv.base, 'GET', '/api/notes');
    assert.strictEqual(r.body.length, 3, 'pedidos inválidos não podem criar notas');
  }

  // ---- ler
  {
    const r = await req(srv.base, 'GET', '/api/notes/' + encodeURIComponent(A.id));
    assert.strictEqual(r.status, 200);
    assert.deepStrictEqual(r.body, A, 'GET /api/notes/:id deve devolver a nota criada');
    const list = await req(srv.base, 'GET', '/api/notes');
    for (const n of [A, B, C]) {
      assert.deepStrictEqual(list.body.find((x) => x.id === n.id), n, 'a lista deve conter a nota ' + n.id);
    }
  }

  // ---- 404
  for (const [m, opts] of [['GET'], ['PUT', { json: { title: 'x', body: 'y' } }], ['DELETE']]) {
    const r = await req(srv.base, m, '/api/notes/id-que-nao-existe', opts);
    assertErrorJson(r, 404, `${m} com id inexistente`);
  }

  // ---- atualizar
  await sleep(50);
  {
    const r = await req(srv.base, 'PUT', '/api/notes/' + A.id, { json: { title: 'Título alterado', body: 'Texto alterado' } });
    assert.strictEqual(r.status, 200, `PUT válido deve dar 200 (recebido ${r.status}: ${r.text.slice(0, 200)})`);
    assert.match(r.headers.get('content-type') || '', /application\/json/i);
    assertNote(r.body, 'PUT');
    assert.strictEqual(r.body.id, A.id, 'PUT não muda o id');
    assert.strictEqual(r.body.title, 'Título alterado');
    assert.strictEqual(r.body.body, 'Texto alterado');
    assert.strictEqual(r.body.createdAt, A.createdAt, 'PUT não muda createdAt');
    assert.ok(Date.parse(r.body.updatedAt) > Date.parse(A.updatedAt), 'PUT deve atualizar updatedAt');
    A.title = r.body.title; A.body = r.body.body; A.updatedAt = r.body.updatedAt;
    const g = await req(srv.base, 'GET', '/api/notes/' + A.id);
    assert.deepStrictEqual(g.body, r.body, 'GET depois do PUT deve refletir a atualização');
  }
  for (const [nome, opts] of [
    ['title vazio', { json: { title: '', body: 'x' } }],
    ['title com 101 caracteres', { json: { title: 'y'.repeat(101), body: 'x' } }],
    ['title em falta', { json: { body: 'x' } }],
    ['JSON inválido', { raw: '{oops' }],
    ['JSON que é um array', { raw: '[1]' }],
  ]) {
    assertErrorJson(await req(srv.base, 'PUT', '/api/notes/' + A.id, opts), 400, `PUT com ${nome}`);
  }
  {
    const g = await req(srv.base, 'GET', '/api/notes/' + A.id);
    assert.deepStrictEqual(g.body, { ...A }, 'um PUT inválido não pode alterar a nota');
  }

  // ---- apagar
  {
    const r = await req(srv.base, 'DELETE', '/api/notes/' + C.id);
    assert.strictEqual(r.status, 204, `DELETE deve dar 204 (recebido ${r.status})`);
    assert.strictEqual(r.text, '', 'DELETE 204 não leva corpo');
    assertErrorJson(await req(srv.base, 'GET', '/api/notes/' + C.id), 404, 'GET depois de DELETE');
    assertErrorJson(await req(srv.base, 'DELETE', '/api/notes/' + C.id), 404, 'segundo DELETE');
    assertErrorJson(await req(srv.base, 'PUT', '/api/notes/' + C.id, { json: { title: 'x' } }), 404, 'PUT depois de DELETE');
    const list = await req(srv.base, 'GET', '/api/notes');
    assert.deepStrictEqual(list.body.map((n) => n.id).sort(), [A.id, B.id].sort(), 'a lista não deve conter a nota apagada');
  }

  // ---- persistência: reiniciar com o mesmo DATA_FILE
  const before = (await req(srv.base, 'GET', '/api/notes')).body;
  await sleep(300);
  await srv.stop();
  assert.ok(fs.existsSync(dataFile), 'DATA_FILE deve existir depois de parar o servidor');
  srv = await startServer(dataFile);
  {
    const after = (await req(srv.base, 'GET', '/api/notes')).body;
    assert.ok(Array.isArray(after), 'GET /api/notes depois do reinício');
    const key = (n) => n.id;
    assert.deepStrictEqual([...after].sort((a, b) => key(a).localeCompare(key(b))), [...before].sort((a, b) => key(a).localeCompare(key(b))),
      'depois do reinício as notas têm de ser as mesmas (incluindo edições e remoções)');
    const g = await req(srv.base, 'GET', '/api/notes/' + A.id);
    assert.deepStrictEqual(g.body, A, 'a nota editada deve sobreviver ao reinício');
    assertErrorJson(await req(srv.base, 'GET', '/api/notes/' + C.id), 404, 'nota apagada continua apagada depois do reinício');
    const n = await req(srv.base, 'POST', '/api/notes', { json: { title: 'Depois do reinício' } });
    assert.strictEqual(n.status, 201);
    assert.ok(![A.id, B.id, C.id].includes(n.body.id), 'ids novos não podem colidir com os existentes');
    const list = await req(srv.base, 'GET', '/api/notes');
    assert.strictEqual(list.body.length, 3);
  }
  await sleep(300);
  await srv.stop();

  // ---- ficheiro já existente com dados é lido no arranque (segundo reinício)
  srv = await startServer(dataFile);
  {
    const list = await req(srv.base, 'GET', '/api/notes');
    assert.strictEqual(list.body.length, 3, 'segundo reinício deve manter as 3 notas');
  }
  await srv.stop();

  // ---- testes do projeto
  function walk(d, out = []) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (e.name === 'node_modules' || e.name === '.git') continue;
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p, out);
      else out.push(p);
    }
    return out;
  }
  const testFiles = walk('.').filter((f) => /(\.test\.[cm]?js|[-_.]test\.js)$/.test(f) || /[\\/]tests?[\\/][^\\/]+\.[cm]?js$/.test(f));
  assert.ok(testFiles.length > 0, 'não há ficheiros de teste');
  const src = testFiles.map((f) => fs.readFileSync(f, 'utf8')).join('\n');
  const cases = (src.match(/\b(?:test|it)\s*\(/g) || []).length;
  assert.ok(cases >= 3, `esperavam-se pelo menos 3 casos de teste, encontrados ${cases}`);
  assert.ok(/api\/notes/.test(src), 'os testes devem exercitar a API /api/notes');
  assert.ok(fs.existsSync('package.json'), 'falta package.json');
  execSync('npm test', { stdio: 'inherit', timeout: 80000 });
  console.log('ok');
}

main().then(
  () => { for (const c of running) c.kill(); process.exit(0); },
  (e) => { console.error(e && e.stack ? e.stack : e); for (const c of running) c.kill(); process.exit(1); },
);
