const test = require('node:test');
const assert = require('node:assert');
const { withServer } = require('../testkit');

function expectError(r, status, code) {
  assert.strictEqual(r.status, status);
  assert.strictEqual(r.json.error.code, code);
  assert.strictEqual(typeof r.json.error.message, 'string');
  assert.ok(!/\n\s+at /.test(r.text), 'não pode haver stack na resposta');
}

test('404 em JSON para recursos e rotas inexistentes', () => withServer(async (call) => {
  expectError(await call('GET', '/customers/99999'), 404, 'NOT_FOUND');
  expectError(await call('GET', '/products/12345'), 404, 'NOT_FOUND');
  expectError(await call('GET', '/orders/42'), 404, 'NOT_FOUND');
  expectError(await call('GET', '/nada'), 404, 'NOT_FOUND');
  expectError(await call('POST', '/orders', { customerId: 77, productId: 1, quantity: 1 }), 404, 'NOT_FOUND');
}));

test('400 para dados inválidos e para JSON inválido', () => withServer(async (call) => {
  expectError(await call('POST', '/customers', {}), 400, 'VALIDATION_ERROR');
  expectError(await call('POST', '/products', { name: 'x', sku: 'y', price: -3 }), 400, 'VALIDATION_ERROR');
  expectError(await call('POST', '/orders', { customerId: 1, productId: 1, quantity: 0 }), 400, 'VALIDATION_ERROR');
  expectError(await call('POST', '/orders', '{nope'), 400, 'INVALID_JSON');
  expectError(await call('POST', '/customers', '{nope'), 400, 'INVALID_JSON');
  expectError(await call('POST', '/products', ''), 400, 'INVALID_JSON');
}));

test('409 em duplicados', () => withServer(async (call) => {
  expectError(await call('POST', '/customers', { name: 'Outra', email: 'alice@example.com' }), 409, 'CONFLICT');
  expectError(await call('POST', '/products', { name: 'Outro', sku: 'W-1', price: 1 }), 409, 'CONFLICT');
}));

test('500 genérico para erros inesperados', () => withServer(async (call) => {
  const log = console.error;
  console.error = () => {};
  try {
    const r = await call('GET', '/products/99');
    expectError(r, 500, 'INTERNAL_ERROR');
    assert.ok(!/toFixed/.test(r.text));
  } finally {
    console.error = log;
  }
}));
