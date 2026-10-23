const test = require('node:test');
const assert = require('node:assert');
const { withServer } = require('../testkit');

test('lista os produtos', () => withServer(async (call) => {
  const r = await call('GET', '/products');
  assert.strictEqual(r.status, 200);
  assert.ok(r.json.some((p) => p.sku === 'W-1'));
}));

test('obtém um produto por id', () => withServer(async (call) => {
  const r = await call('GET', '/products/1');
  assert.strictEqual(r.status, 200);
  assert.deepStrictEqual(r.json, { id: 1, name: 'Widget', sku: 'W-1', price: 9.99 });
}));

test('cria um produto', () => withServer(async (call) => {
  const r = await call('POST', '/products', { name: 'Doohickey', sku: 'D-1', price: 5 });
  assert.strictEqual(r.status, 201);
  assert.strictEqual(r.json.sku, 'D-1');
  assert.strictEqual(r.json.price, 5);
}));

test('rejeita preço negativo', () => withServer(async (call) => {
  const r = await call('POST', '/products', { name: 'Mau', sku: 'M-1', price: -1 });
  assert.strictEqual(r.status, 400);
}));

test('produto inexistente dá 404', () => withServer(async (call) => {
  const r = await call('GET', '/products/12345');
  assert.strictEqual(r.status, 404);
}));
