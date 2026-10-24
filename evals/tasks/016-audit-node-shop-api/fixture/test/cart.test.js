'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startServer, request, signUp } = require('./helpers');

let app;
before(async () => {
  app = await startServer();
});
after(() => app.close());

test('lists only active products', async () => {
  const res = await request(app.base, 'GET', '/products');
  assert.equal(res.status, 200);
  assert.ok(res.body.length > 0);
  assert.ok(res.body.every((p) => p.active));
});

test('filters products by category', async () => {
  const res = await request(app.base, 'GET', '/products?category=escritorio');
  assert.ok(res.body.every((p) => p.category === 'escritorio'));
});

test('cart preview with shipping below the free-shipping threshold', async () => {
  const { token } = await signUp(app.base);
  const res = await request(app.base, 'POST', '/cart/items', { token, body: { productId: 3, qty: 2 } });
  assert.equal(res.status, 200);
  assert.equal(res.body.subtotal, 25);
  assert.equal(res.body.shipping, 4.9);
  assert.equal(res.body.tax, 5.75);
  assert.equal(res.body.total, 35.65);
});

test('cart preview with a percentage coupon', async () => {
  const { token } = await signUp(app.base);
  await request(app.base, 'POST', '/cart/items', { token, body: { productId: 1, qty: 2 } });
  const res = await request(app.base, 'POST', '/cart/coupon', { token, body: { code: 'welcome10' } });
  assert.equal(res.status, 200);
  assert.equal(res.body.coupon, 'WELCOME10');
  assert.equal(res.body.subtotal, 69.8);
  assert.equal(res.body.discount, 6.98);
  assert.equal(res.body.shipping, 0);
  assert.equal(res.body.total, 77.27);
});

test('rejects unknown products and coupons', async () => {
  const { token } = await signUp(app.base);
  assert.equal((await request(app.base, 'POST', '/cart/items', { token, body: { productId: 999 } })).status, 404);
  assert.equal((await request(app.base, 'POST', '/cart/coupon', { token, body: { code: 'SUMMER15' } })).status, 404);
});

test('removes a line from the cart', async () => {
  const { token } = await signUp(app.base);
  await request(app.base, 'POST', '/cart/items', { token, body: { productId: 2 } });
  const res = await request(app.base, 'DELETE', '/cart/items/2', { token });
  assert.equal(res.body.lines.length, 0);
  assert.equal(res.body.total, 0);
});
