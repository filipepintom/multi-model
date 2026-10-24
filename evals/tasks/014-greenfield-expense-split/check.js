// Check escondido: copiado para o workspace só depois do agente terminar.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

assert.ok(fs.existsSync('split.js'), 'falta split.js na raiz do projeto');
const mod = require(path.resolve('split.js'));
assert.strictEqual(typeof mod.settle, 'function', 'split.js deve exportar a função settle (module.exports = { settle } ou exports.settle)');
const { settle } = mod;

const clone = (x) => JSON.parse(JSON.stringify(x));
const isCents = (x) => Math.abs(x * 100 - Math.round(x * 100)) < 1e-6;

// Saldos "verdadeiros" (em euros, sem arredondar): positivo = tem a receber.
function balances(expenses) {
  const b = new Map();
  const add = (k, v) => b.set(k, (b.get(k) || 0) + v);
  for (const e of expenses) {
    if (!e.participants.length) continue;
    add(e.paidBy, e.amount);
    for (const p of e.participants) add(p, -e.amount / e.participants.length);
  }
  return b;
}

function people(expenses) {
  const s = new Set();
  for (const e of expenses) { s.add(e.paidBy); e.participants.forEach((p) => s.add(p)); }
  return s;
}

// Corre settle e valida todas as propriedades. Devolve as transferências.
//   tol: tolerância do saldo final por pessoa, em euros
//   maxTransfers: se omitido, é (pessoas com saldo não nulo) - 1
function run(label, expenses, { tol, maxTransfers } = {}) {
  const input = clone(expenses);
  const transfers = settle(input);
  assert.deepStrictEqual(input, expenses, `${label}: settle não deve alterar o input`);
  assert.ok(Array.isArray(transfers), `${label}: settle deve devolver um array`);

  const names = people(expenses);
  const bal = balances(expenses);
  for (const [i, t] of transfers.entries()) {
    const d = `${label}: transferência #${i} ${JSON.stringify(t)}`;
    assert.ok(t && typeof t.from === 'string' && typeof t.to === 'string', `${d}: from/to devem ser strings`);
    assert.ok(typeof t.amount === 'number' && Number.isFinite(t.amount), `${d}: amount deve ser um número finito`);
    assert.ok(t.amount > 0, `${d}: o valor tem de ser positivo`);
    assert.notStrictEqual(t.from, t.to, `${d}: não pode ser uma transferência para si próprio`);
    assert.ok(isCents(t.amount), `${d}: o valor deve estar arredondado ao cêntimo`);
    assert.ok(names.has(t.from) && names.has(t.to), `${d}: pessoa desconhecida`);
    bal.set(t.from, (bal.get(t.from) || 0) + t.amount);
    bal.set(t.to, (bal.get(t.to) || 0) - t.amount);
  }
  const limit = tol ?? 0.01 * Math.max(1, expenses.length);
  for (const [name, v] of bal) {
    assert.ok(Math.abs(v) <= limit + 1e-9, `${label}: depois das transferências ${name} fica com saldo ${v.toFixed(4)} (tolerância ${limit})`);
  }
  if (maxTransfers === undefined) {
    const nonZero = [...balances(expenses).values()].filter((v) => Math.abs(v) > 0.005).length;
    maxTransfers = Math.max(0, nonZero - 1);
  }
  assert.ok(transfers.length <= maxTransfers, `${label}: ${transfers.length} transferências, no máximo ${maxTransfers}: ${JSON.stringify(transfers)}`);
  return transfers;
}

const sortT = (ts) => ts.map((t) => ({ from: t.from, to: t.to, amount: t.amount })).sort((a, b) => (a.from + a.to).localeCompare(b.from + b.to));
const exp = (paidBy, amount, participants) => ({ paidBy, amount, participants });

// ---- casos simples
assert.deepStrictEqual(settle([]), [], 'sem despesas deve devolver []');

assert.deepStrictEqual(
  sortT(run('divisão exata', [exp('A', 30, ['A', 'B', 'C'])], { tol: 0.0051 })),
  [{ from: 'B', to: 'A', amount: 10 }, { from: 'C', to: 'A', amount: 10 }],
  'A paga 30 por A, B e C: B e C pagam 10 a A');

assert.deepStrictEqual(
  sortT(run('pagador fora dos participantes', [exp('A', 30, ['B', 'C'])], { tol: 0.0051 })),
  [{ from: 'B', to: 'A', amount: 15 }, { from: 'C', to: 'A', amount: 15 }],
  'A paga 30 só por B e C: cada um paga 15 a A');

assert.deepStrictEqual(run('pagou só para si', [exp('A', 20, ['A'])], { tol: 0.0051 }), [], 'quem paga só por si não gera transferências');
// O contrato não diz o que fazer com despesas de 0 €: aceitar ([] sem transferências) ou rejeitar com um erro são ambos corretos.
{
  let rejected = false;
  try { settle([exp('A', 0, ['A', 'B'])]); } catch (e) { rejected = !(e instanceof assert.AssertionError); }
  if (!rejected) assert.deepStrictEqual(run('despesa de valor zero', [exp('A', 0, ['A', 'B'])], { tol: 0.0051 }), [], 'despesa de 0 € aceite não gera transferências');
}
assert.deepStrictEqual(run('tudo equilibrado', [exp('A', 20, ['A', 'B']), exp('B', 20, ['A', 'B'])], { tol: 0.0051 }), [],
  'quando as contas já estão certas não há transferências');

assert.deepStrictEqual(
  sortT(run('dívidas que se anulam', [exp('A', 60, ['A', 'B', 'C']), exp('B', 30, ['A', 'B', 'C'])], { tol: 0.0051 })),
  [{ from: 'C', to: 'A', amount: 30 }],
  'B fica a zero: só C paga 30 a A');

// ---- divisões que não dão certo
{
  const t = run('10 € por 3', [exp('A', 10, ['A', 'B', 'C'])], { tol: 0.01 });
  assert.strictEqual(t.length, 2, '10 € por 3: duas transferências');
  for (const x of t) {
    assert.strictEqual(x.to, 'A', '10 € por 3: só o A recebe');
    assert.ok([3.33, 3.34].includes(Math.round(x.amount * 100) / 100), `10 € por 3: cada um paga 3,33 ou 3,34 (recebido ${x.amount})`);
  }
  assert.deepStrictEqual(t.map((x) => x.from).sort(), ['B', 'C'], '10 € por 3: pagam B e C');
}
{
  const t = run('10 € por 3 com pagador de fora', [exp('D', 10, ['A', 'B', 'C'])], { tol: 0.01 });
  assert.strictEqual(t.length, 3, 'D paga 10 € por A, B, C: três transferências');
  for (const x of t) assert.strictEqual(x.to, 'D');
}
{
  const t = run('100 € por 7', [exp('A', 100, ['A', 'B', 'C', 'D', 'E', 'F', 'G'])], { tol: 0.01 });
  assert.strictEqual(t.length, 6);
  for (const x of t) assert.ok(x.amount >= 14.28 && x.amount <= 14.29, `100 € por 7: ${x.amount}`);
}
{
  const t = run('0,30 € por 2', [exp('A', 0.3, ['A', 'B'])], { tol: 0.0051 });
  assert.deepStrictEqual(sortT(t), [{ from: 'B', to: 'A', amount: 0.15 }]);
}
{
  // 19,99 * 100 = 1998.9999999999998 em vírgula flutuante
  const t = run('19,99 € por 2', [exp('A', 19.99, ['A', 'B'])], { tol: 0.01 });
  assert.strictEqual(t.length, 1);
  assert.ok([9.99, 10].includes(Math.round(t[0].amount * 100) / 100), `19,99 € por 2: ${t[0].amount}`);
}
{
  const t = run('duas despesas com 10 € por 3', [exp('A', 10, ['A', 'B', 'C']), exp('B', 10, ['A', 'B', 'C'])], { tol: 0.02 });
  assert.ok(t.length >= 1 && t.length <= 2);
  for (const x of t) assert.strictEqual(x.from, 'C', 'só o C é devedor');
  const total = t.reduce((s, x) => s + x.amount, 0);
  assert.ok(Math.abs(total - 6.67) <= 0.021, `o C deve pagar cerca de 6,67 no total (pagou ${total})`);
}

// ---- vários credores e devedores
run('quatro pessoas', [exp('A', 40, ['C', 'D']), exp('B', 10, ['C'])], { tol: 0.0051, maxTransfers: 3 });
run('viagem', [
  exp('Ana', 120, ['Ana', 'Rui', 'Marta', 'Joao']),
  exp('Rui', 60, ['Ana', 'Rui', 'Marta', 'Joao']),
  exp('Marta', 45, ['Rui', 'Marta', 'Joao']),
  exp('Joao', 20, ['Ana', 'Joao']),
], { tol: 0.0051 });

// ---- propriedades em muitos cenários aleatórios (gerador com semente: determinístico)
function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const NAMES = ['Ana', 'Rui', 'Marta', 'Joao', 'Sofia', 'Pedro', 'Ines', 'Tiago'];

function scenario(rand, exact) {
  const nPeople = 2 + Math.floor(rand() * (NAMES.length - 1));
  const group = NAMES.slice(0, nPeople);
  const nExp = 1 + Math.floor(rand() * 9);
  const expenses = [];
  for (let i = 0; i < nExp; i++) {
    const participants = group.filter(() => rand() < 0.6);
    if (!participants.length) participants.push(group[Math.floor(rand() * nPeople)]);
    const paidBy = group[Math.floor(rand() * nPeople)];
    // exact: o valor em cêntimos é múltiplo do nº de participantes, logo as partes são cêntimos inteiros
    const cents = exact
      ? participants.length * (1 + Math.floor(rand() * 4000))
      : 1 + Math.floor(rand() * 20000);
    expenses.push({ paidBy, amount: cents / 100, participants });
  }
  return expenses;
}

{
  const rand = rng(20240607);
  for (let i = 0; i < 300; i++) {
    const expenses = scenario(rand, true);
    run(`aleatório exato #${i} ${JSON.stringify(expenses)}`, expenses, { tol: 0.0051 });
  }
  for (let i = 0; i < 300; i++) {
    const expenses = scenario(rand, false);
    // com divisões não exatas, o nº de pessoas com saldo "não nulo" pode ser ambíguo por causa de cêntimos;
    // por isso o limite é (pessoas envolvidas - 1)
    run(`aleatório geral #${i} ${JSON.stringify(expenses)}`, expenses, { maxTransfers: Math.max(0, people(expenses).size - 1) });
  }
}

console.log('ok');
