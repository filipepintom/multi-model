'use strict';

const db = require('../db');
const { resolveLines, VAT_RATE, SHIPPING_FEE, FREE_SHIPPING_FROM } = require('./pricing');

function applyCoupon(subtotal, code) {
  if (!code) return 0;
  const promo = db.coupons.get(code);
  if (!promo || !promo.active) return 0;
  if (promo.type === 'percent') return (subtotal * promo.value) / 100;
  return Math.min(promo.value, subtotal);
}

// Creates a pending order from the cart. Prices are taken from the catalogue
// at this moment, so later price changes do not affect the order.
function placeOrder(user, cart) {
  const lines = resolveLines(cart.items);
  const order = {
    id: db.nextId('order'),
    userId: user.id,
    lines,
    coupon: cart.coupon,
    ...computeTotals(lines, cart.coupon),
    currency: 'EUR',
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  db.orders.set(order.id, order);
  return order;
}

function computeTotals(lines, couponCode) {
  const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);
  const discount = applyCoupon(subtotal, couponCode);
  const net = subtotal - discount;
  const shipping = net >= FREE_SHIPPING_FROM ? 0 : SHIPPING_FEE;
  const tax = net * VAT_RATE;
  return { subtotal, discount, shipping, tax, total: net + shipping + tax };
}

module.exports = { placeOrder, computeTotals };
