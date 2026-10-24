'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startServer, request, signUp } = require('./helpers');
const wallet = require('../src/services/wallet');

let app;
before(async () => {
  app = await startServer();
});
after(() => app.close());

async function orderWith(token, productId, qty) {
  await request(app.base, 'POST', '/cart/items', { token, body: { productId, qty } });
  return request(app.base, 'POST', '/orders', { token });
}

test('creates a pending order and empties the cart', async () => {
  const { token } = await signUp(app.base);
  const res = await orderWith(token, 4, 1);
  assert.equal(res.status, 201);
  assert.equal(res.body.status, 'pending');
  assert.equal(res.body.lines.length, 1);

  const cart = await request(app.base, 'GET', '/cart', { token });
  assert.equal(cart.body.lines.length, 0);

  const list = await request(app.base, 'GET', '/orders', { token });
  assert.deepEqual(list.body.map((o) => o.id), [res.body.id]);
});

test('refuses to create an order from an empty cart', async () => {
  const { token } = await signUp(app.base);
  assert.equal((await request(app.base, 'POST', '/orders', { token })).status, 400);
});

test('pays an order with the wallet', async () => {
  const { token, user } = await signUp(app.base);
  wallet.credit(user.id, 100, 'test-topup');
  const order = await orderWith(token, 4, 1);

  const paid = await request(app.base, 'POST', `/orders/${order.body.id}/pay`, { token, body: { method: 'wallet' } });
  assert.equal(paid.status, 200);
  assert.equal(paid.body.status, 'paid');

  const balance = await request(app.base, 'GET', '/wallet', { token });
  assert.ok(balance.body.balance < 100);
  assert.equal(balance.body.ledger.at(-1).type, 'debit');
});

test('refuses a wallet payment without enough balance', async () => {
  const { token } = await signUp(app.base);
  const order = await orderWith(token, 4, 1);
  const res = await request(app.base, 'POST', `/orders/${order.body.id}/pay`, { token, body: { method: 'wallet' } });
  assert.equal(res.status, 402);
  const again = await request(app.base, 'GET', `/orders/${order.body.id}`, { token });
  assert.equal(again.body.status, 'pending');
});

test('pays an order with a card', async () => {
  const { token } = await signUp(app.base);
  const order = await orderWith(token, 1, 1);
  const res = await request(app.base, 'POST', `/orders/${order.body.id}/pay`, {
    token,
    body: { method: 'card', cardToken: 'tok_visa' },
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.status, 'paid');
  assert.ok(res.body.pspReference.startsWith('cap_'));
});

test('does not accept a second payment', async () => {
  const { token } = await signUp(app.base);
  const order = await orderWith(token, 1, 1);
  const pay = () => request(app.base, 'POST', `/orders/${order.body.id}/pay`, { token, body: { method: 'card', cardToken: 'tok_visa' } });
  assert.equal((await pay()).status, 200);
  assert.equal((await pay()).status, 409);
});
