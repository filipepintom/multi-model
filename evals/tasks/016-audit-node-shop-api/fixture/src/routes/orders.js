'use strict';

const db = require('../db');
const { send, HttpError } = require('../http');
const { requireAuth } = require('../auth');
const checkout = require('../services/checkout');

module.exports = function registerOrderRoutes(router) {
  // Turns the current cart into a pending order; payment is a separate step.
  router.post('/orders', requireAuth, (req, res) => {
    const cart = db.carts.get(req.user.id);
    if (!cart || cart.items.length === 0) throw new HttpError(400, 'cart is empty');

    const order = checkout.placeOrder(req.user, cart);
    db.carts.delete(req.user.id);
    send(res, 201, order);
  });

  router.get('/orders', requireAuth, (req, res) => {
    const mine = [...db.orders.values()]
      .filter((order) => order.userId === req.user.id)
      .sort((a, b) => b.id - a.id);
    send(res, 200, mine);
  });

  router.get('/orders/:id', requireAuth, (req, res) => {
    const order = db.orders.get(Number(req.params.id));
    if (!order) throw new HttpError(404, 'order not found');
    send(res, 200, order);
  });
};
