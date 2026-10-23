const test = require('node:test');
const assert = require('node:assert');
const { withServer } = require('../testkit');

test('cria uma encomenda e calcula o total', () => withServer(async (call) => {
  const r = await call('POST', '/orders', { customerId: 1, productId: 1, quantity: 2 });
  assert.strictEqual(r.status, 201);
  assert.deepStrictEqual(r.json, { id: 1, customerId: 1, productId: 1, quantity: 2, unitPrice: 9.99, total: 19.98 });
}));

test('obtém e lista encomendas', () => withServer(async (call) => {
  await call('POST', '/orders', { customerId: 1, productId: 2, quantity: 1 });
  const one = await call('GET', '/orders/1');
  assert.strictEqual(one.status, 200);
  assert.strictEqual(one.json.total, 24.5);
  const list = await call('GET', '/orders');
  assert.strictEqual(list.json.length, 1);
}));

test('rejeita quantidade inválida', () => withServer(async (call) => {
  const r = await call('POST', '/orders', { customerId: 1, productId: 1, quantity: 0 });
  assert.strictEqual(r.status, 400);
}));

test('encomenda inexistente dá 404', () => withServer(async (call) => {
  const r = await call('GET', '/orders/42');
  assert.strictEqual(r.status, 404);
}));
