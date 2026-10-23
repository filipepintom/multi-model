const test = require('node:test');
const assert = require('node:assert');
const { withServer } = require('../testkit');

test('lista os clientes', () => withServer(async (call) => {
  const r = await call('GET', '/customers');
  assert.strictEqual(r.status, 200);
  assert.deepStrictEqual(r.json, [{ id: 1, name: 'Alice', email: 'alice@example.com' }]);
}));

test('obtém um cliente por id', () => withServer(async (call) => {
  const r = await call('GET', '/customers/1');
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.json.name, 'Alice');
}));

test('cria um cliente', () => withServer(async (call) => {
  const r = await call('POST', '/customers', { name: 'Bob', email: 'bob@example.com' });
  assert.strictEqual(r.status, 201);
  assert.deepStrictEqual(r.json, { id: 2, name: 'Bob', email: 'bob@example.com' });
  const list = await call('GET', '/customers');
  assert.strictEqual(list.json.length, 2);
}));

test('rejeita um cliente sem nome', () => withServer(async (call) => {
  const r = await call('POST', '/customers', { email: 'x@example.com' });
  assert.strictEqual(r.status, 400);
}));
