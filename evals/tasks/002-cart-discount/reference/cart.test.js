const test = require('node:test');
const assert = require('node:assert');
const { total } = require('./cart');

test('soma preço × quantidade', () => {
  assert.strictEqual(total([{ price: 10, qty: 2 }, { price: 5, qty: 1 }]), 25);
});

test('aplica o desconto como percentagem', () => {
  assert.strictEqual(total([{ price: 10, qty: 2 }, { price: 5, qty: 1 }], 10), 22.5);
});
