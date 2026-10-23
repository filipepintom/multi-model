const db = require('../db');

function text(res, status, message) {
  res.writeHead(status, { 'Content-Type': 'text/plain' });
  res.end(message);
}

function handle(req, res, pathname) {
  let m;

  if (req.method === 'GET' && pathname === '/products') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(db.listProducts()));
    return true;
  }

  if (req.method === 'GET' && (m = pathname.match(/^\/products\/(\d+)$/))) {
    try {
      const product = db.getProduct(Number(m[1]));
      if (!product) return text(res, 404, 'Product not found'), true;
      const view = { id: product.id, name: product.name, sku: product.sku, price: db.formatPrice(product) };
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(view));
    } catch (err) {
      text(res, 500, 'Something went wrong: ' + err.message);
    }
    return true;
  }

  if (req.method === 'POST' && pathname === '/products') {
    let raw = '';
    req.on('data', (chunk) => { raw += chunk; });
    req.on('end', () => {
      try {
        let body;
        try {
          body = JSON.parse(raw);
        } catch (e) {
          return text(res, 400, 'Bad JSON');
        }
        if (!body || typeof body.name !== 'string' || !body.name.trim()) return text(res, 400, 'name is required');
        if (typeof body.sku !== 'string' || !body.sku.trim()) return text(res, 400, 'sku is required');
        if (typeof body.price !== 'number' || !Number.isFinite(body.price) || body.price < 0) {
          return text(res, 400, 'price must be a non-negative number');
        }
        const product = db.addProduct({ name: body.name.trim(), sku: body.sku.trim(), price: body.price });
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ id: product.id, name: product.name, sku: product.sku, price: product.price }));
      } catch (err) {
        text(res, 500, 'Error: ' + err.message);
      }
    });
    return true;
  }

  return false;
}

module.exports = { handle };
