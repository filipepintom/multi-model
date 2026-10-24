'use strict';

// In-memory store for the pilot. Everything lives for the lifetime of the
// process; the plan is to move to Postgres once the API is stable.

const products = new Map(
  [
    { id: 1, sku: 'K200', name: 'Chaleira elétrica K200', category: 'cozinha', price: 34.9, manual: 'k200-manual.txt', active: true },
    { id: 2, sku: 'T110', name: 'Torradeira T110', category: 'cozinha', price: 29.99, manual: 't110-manual.txt', active: true },
    { id: 3, sku: 'C050', name: 'Caneca térmica 500 ml', category: 'cozinha', price: 12.5, manual: null, active: true },
    { id: 4, sku: 'L300', name: 'Candeeiro de secretária L300', category: 'escritorio', price: 45, manual: 'l300-manual.txt', active: true },
    { id: 5, sku: 'P010', name: 'Pack 10 pilhas AA', category: 'escritorio', price: 7.45, manual: null, active: true },
    { id: 6, sku: 'M900', name: 'Moinho de café M900', category: 'cozinha', price: 89, manual: 'm900-manual.txt', active: false },
  ].map((p) => [p.id, p]),
);

const coupons = new Map(
  [
    { code: 'WELCOME10', type: 'percent', value: 10, active: true },
    { code: 'GIFT20', type: 'fixed', value: 20, active: true },
    { code: 'OUTLET60', type: 'percent', value: 60, active: true },
    { code: 'SUMMER15', type: 'percent', value: 15, active: false },
  ].map((c) => [c.code, c]),
);

const users = new Map(); // id -> { id, email, name, passwordHash, createdAt }
const wallets = new Map(); // userId -> { balance, ledger }
const carts = new Map(); // userId -> { items: [{ productId, qty }], coupon }
const orders = new Map(); // id -> order

const counters = { user: 0, order: 1000 };

function nextId(kind) {
  counters[kind] += 1;
  return counters[kind];
}

function findUserByEmail(email) {
  for (const user of users.values()) {
    if (user.email === email) return user;
  }
  return null;
}

module.exports = { products, coupons, users, wallets, carts, orders, nextId, findUserByEmail };
