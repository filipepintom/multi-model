// Check escondido: copiado para o workspace só depois do agente terminar.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execSync } = require('child_process');

const modPath = path.resolve('search-state.js');
assert.ok(fs.existsSync(modPath), 'falta search-state.js na raiz');

// 1. Carregado com require (CommonJS)
const viaRequire = require(modPath);
assert.ok(viaRequire && typeof viaRequire.reducer === 'function', 'require(search-state.js) deve exportar reducer');
assert.ok(viaRequire.initialState && typeof viaRequire.initialState === 'object', 'require(search-state.js) deve exportar initialState');

// 2. Carregado como <script> clássico: sem module/exports, deve expor o global SearchState
{
  const sandbox = {};
  sandbox.window = sandbox;
  sandbox.self = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(modPath, 'utf8'), sandbox, { filename: 'search-state.js' });
  const g = sandbox.SearchState;
  assert.ok(g && typeof g.reducer === 'function' && g.initialState,
    'carregado via <script> (sem module/exports) deve expor o global SearchState com { initialState, reducer }');
  const s = g.reducer(g.initialState, { type: 'QUERY_CHANGED', query: 'ab' });
  assert.strictEqual(s.status, 'loading', 'o reducer do global SearchState tem de funcionar');
}

const { initialState, reducer } = viaRequire;
const clone = (x) => JSON.parse(JSON.stringify(x));

// Aplica uma ação verificando que o estado recebido não é alterado (pureza).
function step(state, action) {
  const before = clone(state);
  const next = reducer(state, action);
  assert.deepStrictEqual(clone(state), before, `o reducer alterou o estado recebido na ação ${action.type}`);
  assert.ok(next && typeof next === 'object', `o reducer deve devolver um estado na ação ${action.type}`);
  return next;
}
const changed = (s, query) => step(s, { type: 'QUERY_CHANGED', query });
const got = (s, query, results) => step(s, { type: 'RESULTS_RECEIVED', query, results });
const failed = (s, query) => step(s, { type: 'REQUEST_FAILED', query, error: new Error('falhou') });
const retry = (s) => step(s, { type: 'RETRY' });

const item = (id) => ({ id, name: 'Fruta ' + id });

// Estado inicial
assert.strictEqual(initialState.status, 'idle', 'initialState.status deve ser idle');
assert.strictEqual(initialState.query, '', 'initialState.query deve ser ""');
assert.deepStrictEqual(initialState.results, [], 'initialState.results deve ser []');

// idle -> loading
let s = changed(initialState, 'ma');
assert.strictEqual(s.status, 'loading', 'QUERY_CHANGED com texto -> loading');
assert.strictEqual(s.query, 'ma', 'state.query deve ser a query recebida');

// loading -> success
let ok = got(s, 'ma', [item(1), item(2)]);
assert.strictEqual(ok.status, 'success', 'RESULTS_RECEIVED com itens -> success');
assert.deepStrictEqual(clone(ok.results), [item(1), item(2)], 'state.results deve ter os itens recebidos');
assert.strictEqual(ok.query, 'ma', 'a query mantém-se em success');

// loading -> empty
let empty = got(s, 'ma', []);
assert.strictEqual(empty.status, 'empty', 'RESULTS_RECEIVED sem itens -> empty');

// loading -> error
let err = failed(s, 'ma');
assert.strictEqual(err.status, 'error', 'REQUEST_FAILED -> error');
assert.ok(err.error !== null && err.error !== undefined && err.error !== '', 'state.error deve ficar preenchido');
assert.strictEqual(err.query, 'ma', 'a query mantém-se em error');

// RETRY: error -> loading com a mesma query; depois pode resolver
let again = retry(err);
assert.strictEqual(again.status, 'loading', 'RETRY em error -> loading');
assert.strictEqual(again.query, 'ma', 'RETRY mantém a query');
assert.strictEqual(got(again, 'ma', [item(3)]).status, 'success', 'depois do RETRY, resultados válidos -> success');
assert.strictEqual(failed(again, 'ma').status, 'error', 'depois do RETRY, nova falha -> error');

// RETRY fora de error não faz nada
for (const [nome, st] of [['idle', initialState], ['loading', s], ['success', ok], ['empty', empty]]) {
  assert.deepStrictEqual(clone(retry(st)), clone(st), `RETRY em ${nome} não deve alterar o estado`);
}

// Query vazia ou só com espaços volta a idle, a partir de qualquer estado
for (const [nome, st] of [['loading', s], ['success', ok], ['empty', empty], ['error', err]]) {
  for (const q of ['', '   ', '\t \n']) {
    const idle = changed(st, q);
    assert.strictEqual(idle.status, 'idle', `query ${JSON.stringify(q)} a partir de ${nome} deve voltar a idle`);
    assert.strictEqual(idle.query, '', 'em idle a query deve ser ""');
  }
}

// Novo texto a partir de success/empty/error -> loading com a nova query
for (const [nome, st] of [['success', ok], ['empty', empty], ['error', err]]) {
  const n = changed(st, 'mac');
  assert.strictEqual(n.status, 'loading', `nova query a partir de ${nome} -> loading`);
  assert.strictEqual(n.query, 'mac', 'nova query guardada');
}

// Respostas desatualizadas são ignoradas
{
  const q1 = changed(initialState, 'a');
  const q2 = changed(q1, 'ab');
  const lateOk = got(q2, 'a', [item(9)]);
  assert.strictEqual(lateOk.status, 'loading', 'resultados da query antiga não podem alterar o estado (continua loading)');
  assert.strictEqual(lateOk.query, 'ab', 'a query atual mantém-se');
  assert.deepStrictEqual(clone(lateOk), clone(q2), 'resultado desatualizado deve devolver o mesmo estado');
  const lateFail = failed(q2, 'a');
  assert.strictEqual(lateFail.status, 'loading', 'falha da query antiga não pode levar a error');
  assert.deepStrictEqual(clone(lateFail), clone(q2), 'falha desatualizada deve devolver o mesmo estado');
  // a resposta certa continua a funcionar depois de ignorar a antiga
  assert.strictEqual(got(lateOk, 'ab', [item(1)]).status, 'success', 'a resposta da query atual é aceite');

  // resposta tardia depois de o campo ter sido esvaziado
  const cleared = changed(q1, '  ');
  const afterClear = got(cleared, 'a', [item(1)]);
  assert.strictEqual(afterClear.status, 'idle', 'resposta tardia depois de limpar o campo não pode sair de idle');

  // resposta tardia depois de já termos um resultado para a query atual
  const done = got(q2, 'ab', [item(1)]);
  const lateAfterDone = got(done, 'a', [item(7), item(8)]);
  assert.strictEqual(lateAfterDone.status, 'success');
  assert.deepStrictEqual(clone(lateAfterDone.results), [item(1)], 'resultados antigos não substituem os atuais');

  // a -> ab -> a (voltou a escrever a mesma): a resposta de "a" é válida
  const q3 = changed(q2, 'a');
  assert.strictEqual(got(q3, 'a', [item(1)]).status, 'success', 'resposta para a query atual (repetida) é aceite');
}

// 3. index.html
const htmlPath = path.resolve('index.html');
assert.ok(fs.existsSync(htmlPath), 'falta index.html');
const html = fs.readFileSync(htmlPath, 'utf8');
assert.ok(/<script\b[^>]*\bsrc\s*=\s*["']?(?:\.\/|\/)?search-state\.js["'\s>]/i.test(html),
  'index.html deve carregar search-state.js com <script src="search-state.js">');
assert.ok(/\baria-live\s*=\s*["']?(polite|assertive)/i.test(html), 'index.html deve ter uma região com aria-live (polite ou assertive)');
assert.ok(/<button\b[^>]*\bdata-action\s*=\s*["']retry["']/i.test(html), 'index.html deve ter um <button data-action="retry">');
assert.ok(/\/api\/search/.test(html) || /api\/search/.test(html), 'index.html deve continuar a usar /api/search');

// 4. Testes existem e passam
function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === '.git') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}
const testFiles = walk('.').filter((f) => /(\.test\.[cm]?js|[-_.]test\.js)$/.test(f) || /[\\/]tests?[\\/][^\\/]+\.[cm]?js$/.test(f));
assert.ok(testFiles.length > 0, 'não há ficheiros de teste');
const testSrc = testFiles.map((f) => fs.readFileSync(f, 'utf8')).join('\n');
assert.ok(/search-state/.test(testSrc), 'os testes devem exercitar search-state.js');
const cases = (testSrc.match(/\b(?:test|it)\s*\(/g) || []).length;
assert.ok(cases >= 4, `esperavam-se pelo menos 4 casos de teste, encontrados ${cases}`);
assert.ok(/RESULTS_RECEIVED/.test(testSrc), 'os testes devem cobrir RESULTS_RECEIVED (incl. respostas desatualizadas)');

execSync('npm test', { stdio: 'inherit' });
console.log('ok');
