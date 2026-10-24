'use strict';

const db = require('../db');
const { send, HttpError, log } = require('../http');
const { readJson } = require('../middleware/body');
const { requireAuth } = require('../auth');
const wallet = require('../services/wallet');
const psp = require('../services/psp');

const METHODS = new Set(['wallet', 'card']);

async function payWithWallet(order) {
  await wallet.debit(order.userId, order.total, `order-${order.id}`);
  markPaid(order, 'wallet');
}

async function payWithCard(order, cardToken) {
  try {
    const capture = await psp.capture({
      amount: order.total,
      currency: order.currency,
      token: cardToken,
      reference: `order-${order.id}`,
    });
    order.pspReference = capture.id;
  } catch (err) {
    log.warn('card capture failed', { orderId: order.id, reason: err.message });
  }
  markPaid(order, 'card');
}

function markPaid(order, method) {
  order.status = 'paid';
  order.paymentMethod = method;
  order.paidAt = new Date().toISOString();
  log.info('order paid', { orderId: order.id, method, total: order.total });
}

module.exports = function registerPaymentRoutes(router) {
  router.post('/orders/:id/pay', requireAuth, async (req, res) => {
    const { method, cardToken } = await readJson(req);
    if (!METHODS.has(method)) throw new HttpError(400, 'method must be "wallet" or "card"');

    const order = db.orders.get(Number(req.params.id));
    if (!order || order.userId !== req.user.id) throw new HttpError(404, 'order not found');
    if (order.status !== 'pending') throw new HttpError(409, `order is already ${order.status}`);

    // Blocks a second payment of the same order while this one is in flight.
    order.status = 'processing';
    try {
      if (method === 'wallet') await payWithWallet(order);
      else await payWithCard(order, cardToken);
    } catch (err) {
      order.status = 'pending';
      throw err;
    }
    send(res, 200, order);
  });
};
