'use strict';

const db = require('../db');
const { HttpError } = require('../http');

const VAT_RATE = 0.23;
const SHIPPING_FEE = 4.9;
const FREE_SHIPPING_FROM = 40;
const MAX_DISCOUNT_RATIO = 0.5;

function round2(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

// Resolves cart items against the catalogue, with the current price.
function resolveLines(items) {
  return items.map(({ productId, qty }) => {
    const product = db.products.get(productId);
    if (!product || !product.active) {
      throw new HttpError(409, `product ${productId} is no longer available`);
    }
    return {
      productId,
      name: product.name,
      unitPrice: product.price,
      qty,
      lineTotal: round2(product.price * qty),
    };
  });
}

// A coupon never takes more than half of the subtotal, whatever its face value.
function couponDiscount(subtotal, code) {
  if (!code) return 0;
  const promo = db.coupons.get(code);
  if (!promo || !promo.active) return 0;
  const raw = promo.type === 'percent' ? (subtotal * promo.value) / 100 : promo.value;
  return Math.min(raw, subtotal * MAX_DISCOUNT_RATIO);
}

// Price breakdown shown to the customer in the cart.
function quote(items, couponCode) {
  const lines = resolveLines(items);
  const subtotal = round2(lines.reduce((sum, line) => sum + line.lineTotal, 0));
  const discount = round2(couponDiscount(subtotal, couponCode));
  const net = round2(subtotal - discount);
  const shipping = lines.length === 0 || net >= FREE_SHIPPING_FROM ? 0 : SHIPPING_FEE;
  const tax = round2(net * VAT_RATE);
  return { lines, subtotal, discount, shipping, tax, total: round2(net + shipping + tax) };
}

module.exports = { quote, resolveLines, round2, VAT_RATE, SHIPPING_FEE, FREE_SHIPPING_FROM };
