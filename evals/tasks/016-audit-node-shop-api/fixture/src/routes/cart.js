'use strict';

const db = require('../db');
const { send, HttpError } = require('../http');
const { readJson } = require('../middleware/body');
const { requireAuth } = require('../auth');
const pricing = require('../services/pricing');

const MAX_QTY = 20;

function getCart(userId) {
  let cart = db.carts.get(userId);
  if (!cart) {
    cart = { items: [], coupon: null };
    db.carts.set(userId, cart);
  }
  return cart;
}

function preview(cart) {
  return { ...pricing.quote(cart.items, cart.coupon), coupon: cart.coupon };
}

module.exports = function registerCartRoutes(router) {
  router.get('/cart', requireAuth, (req, res) => {
    send(res, 200, preview(getCart(req.user.id)));
  });

  router.post('/cart/items', requireAuth, async (req, res) => {
    const { productId, qty = 1 } = await readJson(req);
    const product = db.products.get(productId);
    if (!product || !product.active) throw new HttpError(404, 'product not found');
    if (!Number.isInteger(qty) || qty < 1) throw new HttpError(400, 'qty must be a positive integer');

    const cart = getCart(req.user.id);
    const line = cart.items.find((item) => item.productId === productId);
    const newQty = (line ? line.qty : 0) + qty;
    if (newQty > MAX_QTY) throw new HttpError(400, `at most ${MAX_QTY} units per product`);

    if (line) line.qty = newQty;
    else cart.items.push({ productId, qty });
    send(res, 200, preview(cart));
  });

  router.delete('/cart/items/:productId', requireAuth, (req, res) => {
    const cart = getCart(req.user.id);
    const productId = Number(req.params.productId);
    cart.items = cart.items.filter((item) => item.productId !== productId);
    send(res, 200, preview(cart));
  });

  router.post('/cart/coupon', requireAuth, async (req, res) => {
    const { code } = await readJson(req);
    if (typeof code !== 'string' || !code.trim()) throw new HttpError(400, 'coupon code is required');

    const normalized = code.trim().toUpperCase();
    const promo = db.coupons.get(normalized);
    if (!promo || !promo.active) throw new HttpError(404, 'unknown or expired coupon');

    const cart = getCart(req.user.id);
    cart.coupon = normalized;
    send(res, 200, preview(cart));
  });
};
