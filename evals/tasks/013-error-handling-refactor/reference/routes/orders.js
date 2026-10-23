const db = require('../db');
const { notFound, validation, readJson, sendJson } = require('../errors');

async function handle(req, res, pathname) {
  let m;

  if (req.method === 'GET' && pathname === '/orders') {
    sendJson(res, 200, db.listOrders());
    return true;
  }

  if (req.method === 'GET' && (m = pathname.match(/^\/orders\/(\d+)$/))) {
    const order = db.getOrder(Number(m[1]));
    if (!order) throw notFound(`Order ${m[1]} not found`);
    sendJson(res, 200, order);
    return true;
  }

  if (req.method === 'POST' && pathname === '/orders') {
    const { customerId, productId, quantity } = await readJson(req);
    if (!Number.isInteger(customerId) || !Number.isInteger(productId)) {
      throw validation('customerId and productId are required');
    }
    if (!Number.isInteger(quantity) || quantity < 1) throw validation('quantity must be a positive integer');
    if (!db.getCustomer(customerId)) throw notFound(`Customer ${customerId} not found`);
    const product = db.getProduct(productId);
    if (!product) throw notFound(`Product ${productId} not found`);
    const unitPrice = db.formatPrice(product);
    const order = db.addOrder({
      customerId,
      productId,
      quantity,
      unitPrice,
      total: Number((unitPrice * quantity).toFixed(2)),
    });
    sendJson(res, 201, order);
    return true;
  }

  return false;
}

module.exports = { handle };
