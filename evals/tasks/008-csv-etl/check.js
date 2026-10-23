// Check escondido: copiado para o workspace só depois do agente terminar.
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const WS = process.cwd();
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'check-etl-'));
const ENV = { ...process.env, PYTHONDONTWRITEBYTECODE: '1' };
delete ENV.PYTHONUTF8; // o enunciado diz UTF-8: o script tem de o tratar explicitamente

const SCRIPT = path.join(WS, 'etl.py');
assert.ok(fs.existsSync(SCRIPT), 'etl.py não existe na raiz do projeto');

function runEtl(input, output, cwd = WS) {
  return spawnSync('python', [SCRIPT, input, output], { cwd, encoding: 'utf8', env: ENV, timeout: 30000 });
}

function runOk(input, output, cwd = WS) {
  const r = runEtl(input, output, cwd);
  assert.strictEqual(r.status, 0, `etl.py terminou com código ${r.status}\n${r.stdout}${r.stderr}`);
  const file = path.isAbsolute(output) ? output : path.join(cwd, output);
  assert.ok(fs.existsSync(file), 'o ficheiro de saída não foi criado');
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

const near = (a, b) => Math.abs(a - b) < 1e-9;

function assertResult(got, exp, label) {
  assert.ok(got && typeof got === 'object', `[${label}] o JSON devia ser um objeto`);
  assert.ok(Array.isArray(got.customers), `[${label}] falta "customers" (lista)`);
  assert.strictEqual(got.customers.length, exp.customers.length,
    `[${label}] número de clientes: esperados ${exp.customers.length} (${exp.customers.map((c) => c.email)}), obtidos ${got.customers.length} (${got.customers.map((c) => c.email)})`);
  exp.customers.forEach((e, i) => {
    const g = got.customers[i];
    for (const k of ['name', 'email', 'country']) {
      assert.strictEqual(g[k], e[k], `[${label}] cliente ${i + 1}, campo ${k}: esperado ${JSON.stringify(e[k])}, obtido ${JSON.stringify(g[k])}`);
    }
    assert.strictEqual(typeof g.amount, 'number', `[${label}] cliente ${i + 1}: amount devia ser um número JSON, veio ${JSON.stringify(g.amount)}`);
    assert.ok(near(g.amount, e.amount), `[${label}] cliente ${i + 1}: amount esperado ${e.amount}, obtido ${g.amount}`);
  });
  assert.strictEqual(got.rejected, exp.rejected, `[${label}] rejected: esperado ${exp.rejected}, obtido ${got.rejected}`);
  assert.ok(got.by_country && typeof got.by_country === 'object', `[${label}] falta "by_country"`);
  assert.deepStrictEqual(Object.keys(got.by_country).sort(), Object.keys(exp.by_country).sort(), `[${label}] países em by_country`);
  for (const [c, e] of Object.entries(exp.by_country)) {
    const g = got.by_country[c];
    assert.strictEqual(g.count, e.count, `[${label}] by_country[${c}].count`);
    assert.strictEqual(typeof g.total_amount, 'number', `[${label}] by_country[${c}].total_amount devia ser número`);
    assert.ok(near(g.total_amount, e.total_amount), `[${label}] by_country[${c}].total_amount: esperado ${e.total_amount}, obtido ${g.total_amount}`);
    assert.ok(near(Math.round(g.total_amount * 100) / 100, g.total_amount), `[${label}] by_country[${c}].total_amount não está arredondado a 2 casas: ${g.total_amount}`);
  }
}

// ---- Oráculo independente (para o CSV do fixture) ----
function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; } else q = false;
      } else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      if (!(row.length === 1 && row[0] === '')) rows.push(row);
      row = [];
    } else cell += ch;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

function oracle(text) {
  const [header, ...rows] = parseCsv(text.replace(/^﻿/, ''));
  const idx = Object.fromEntries(header.map((h, i) => [h.trim(), i]));
  const customers = [];
  const seen = new Set();
  let rejected = 0;
  for (const r of rows) {
    const get = (k) => (r[idx[k]] ?? '').trim();
    const email = get('email').toLowerCase();
    const amountStr = get('amount');
    const parts = email.split('@');
    const emailOk = parts.length === 2 && parts[0] !== '' && parts[1].includes('.');
    const amountOk = /^[+-]?(\d+\.?\d*|\.\d+)$/.test(amountStr);
    if (!emailOk || !amountOk) { rejected++; continue; }
    if (seen.has(email)) continue;
    seen.add(email);
    customers.push({ name: get('name'), email, country: get('country') || 'UNKNOWN', amount: Number(amountStr) });
  }
  const by_country = {};
  for (const c of customers) {
    by_country[c.country] ??= { count: 0, total_amount: 0 };
    by_country[c.country].count++;
    by_country[c.country].total_amount += c.amount;
  }
  for (const v of Object.values(by_country)) v.total_amount = Math.round(v.total_amount * 100) / 100;
  return { customers, by_country, rejected };
}

// ---- 1. CSV gerado pelo check (resultado escrito à mão) ----
const csv1 = [
  'name,email,country,amount',
  '  Ana Silva ,  ANA@Example.COM ,PT, 10.50 ',
  'Bruno Costa,bruno@example.com,ES,20',
  'Ana Outra,ana@example.com,FR,99.99',
  '"Silva, Carla",carla@example.com,,5.25',
  'João Pereira,JOAO@example.com,   ,0.10',
  'Dina,dina@example.com,PT,abc',
  'Eva,not-an-email,PT,10',
  'Fábio,fabio@example,PT,10',
  'Gil,gil@example.com,ES,',
  'Hugo,hugo@example.com,PT,0.20',
  'Inês,ines@example.com,PT,100.1',
  'Bruno Outra Vez,bruno@example.com,ES,xyz',
  'Zé,,PT,5',
  'Hugo Repetido,HUGO@example.com ,PT,7',
].join('\n') + '\n';
fs.writeFileSync(path.join(tmp, 'c1.csv'), csv1, 'utf8');
const exp1 = {
  customers: [
    { name: 'Ana Silva', email: 'ana@example.com', country: 'PT', amount: 10.5 },
    { name: 'Bruno Costa', email: 'bruno@example.com', country: 'ES', amount: 20 },
    { name: 'Silva, Carla', email: 'carla@example.com', country: 'UNKNOWN', amount: 5.25 },
    { name: 'João Pereira', email: 'joao@example.com', country: 'UNKNOWN', amount: 0.1 },
    { name: 'Hugo', email: 'hugo@example.com', country: 'PT', amount: 0.2 },
    { name: 'Inês', email: 'ines@example.com', country: 'PT', amount: 100.1 },
  ],
  by_country: {
    PT: { count: 3, total_amount: 110.8 },
    ES: { count: 1, total_amount: 20 },
    UNKNOWN: { count: 2, total_amount: 5.35 },
  },
  rejected: 6,
};
assert.deepStrictEqual(oracle(csv1), JSON.parse(JSON.stringify(exp1)), 'bug interno do check: oráculo e resultado esperado divergem');
assertResult(runOk(path.join(tmp, 'c1.csv'), path.join(tmp, 'o1.json')), exp1, 'csv gerado');

// ---- 2. Caminhos relativos, CRLF, duplicados e somas em vírgula flutuante ----
const csv2 = [
  'name,email,country,amount',
  'A,Dup@X.com,PT,1',
  'B,dup@x.COM,PT,2',
  'C,dup@x.com,ES,3',
  'D, ,PT,4',
  'E,e@x.com,PT,12abc',
  'F,f@x.com,PT,0.1',
  'G,g@x.com,PT,0.2',
].join('\r\n') + '\r\n';
fs.writeFileSync(path.join(tmp, 'c2.csv'), csv2, 'utf8');
assertResult(runOk('c2.csv', 'o2.json', tmp), {
  customers: [
    { name: 'A', email: 'dup@x.com', country: 'PT', amount: 1 },
    { name: 'F', email: 'f@x.com', country: 'PT', amount: 0.1 },
    { name: 'G', email: 'g@x.com', country: 'PT', amount: 0.2 },
  ],
  by_country: { PT: { count: 3, total_amount: 1.3 } },
  rejected: 2,
}, 'duplicados/CRLF/relativos');

// ---- 3. Só cabeçalho ----
fs.writeFileSync(path.join(tmp, 'c3.csv'), 'name,email,country,amount\n', 'utf8');
assertResult(runOk(path.join(tmp, 'c3.csv'), path.join(tmp, 'o3.json')), { customers: [], by_country: {}, rejected: 0 }, 'só cabeçalho');

// ---- 4. Substitui um ficheiro de saída existente ----
fs.writeFileSync(path.join(tmp, 'o4.json'), '{"lixo": true, "customers": [1,2,3]}' + ' '.repeat(5000));
assertResult(runOk(path.join(tmp, 'c3.csv'), path.join(tmp, 'o4.json')), { customers: [], by_country: {}, rejected: 0 }, 'substituir saída');

// ---- 5. CSV do fixture (data/customers.csv), validado pelo oráculo ----
const fixtureCsv = path.join(WS, 'data', 'customers.csv');
assert.ok(fs.existsSync(fixtureCsv), 'data/customers.csv desapareceu');
const fixtureExpected = oracle(fs.readFileSync(fixtureCsv, 'utf8'));
assert.ok(fixtureExpected.customers.length > 0 && fixtureExpected.rejected > 0, 'bug interno do check: fixture inesperado');
assertResult(runOk(fixtureCsv, path.join(tmp, 'o5.json')), fixtureExpected, 'data/customers.csv');

// ---- 6. Entrada inexistente ----
const bad = runEtl(path.join(tmp, 'nao-existe.csv'), path.join(tmp, 'o6.json'));
assert.notStrictEqual(bad.status, 0, 'com um ficheiro de entrada inexistente o código de saída devia ser diferente de 0');

fs.rmSync(tmp, { recursive: true, force: true });
console.log('ok');
