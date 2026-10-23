const db = require('../db');

function handle(req, res, pathname) {
  let m;

  if (req.method === 'GET' && pathname === '/orders') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(db.listOrders()));
    return true;
  }

  if (req.method === 'GET' && (m = pathname.match(/^\/orders\/(\d+)$/))) {
    const order = db.getOrder(Number(m[1]));
    if (!order) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Order not found' }));
    } else {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(order));
    }
    return true;
  }

  if (req.method === 'POST' && pathname === '/orders') {
    let data = '';
    req.on('data', (chunk) => { data += chunk; });
    req.on('end', () => {
      const body = JSON.parse(data);
      try {
        const { customerId, productId, quantity } = body;
        if (!Number.isInteger(customerId) || !Number.isInteger(productId)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'customerId and productId are required' }));
        }
        if (!Number.isInteger(quantity) || quantity < 1) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'quantity must be a positive integer' }));
        }
        const customer = db.getCustomer(customerId);
        if (!customer) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'customer not found' }));
        }
        const product = db.getProduct(productId);
        if (!product) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'product not found' }));
        }
        const unitPrice = db.formatPrice(product);
        const order = db.addOrder({
          customerId,
          productId,
          quantity,
          unitPrice,
          total: Number((unitPrice * quantity).toFixed(2)),
        });
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(order));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message, stack: err.stack }));
      }
    });
    return true;
  }

  return false;
}

module.exports = { handle };
