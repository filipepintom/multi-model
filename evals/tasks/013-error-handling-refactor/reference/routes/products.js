const db = require('../db');
const { notFound, validation, readJson, sendJson } = require('../errors');

async function handle(req, res, pathname) {
  let m;

  if (req.method === 'GET' && pathname === '/products') {
    sendJson(res, 200, db.listProducts());
    return true;
  }

  if (req.method === 'GET' && (m = pathname.match(/^\/products\/(\d+)$/))) {
    const product = db.getProduct(Number(m[1]));
    if (!product) throw notFound(`Product ${m[1]} not found`);
    sendJson(res, 200, { id: product.id, name: product.name, sku: product.sku, price: db.formatPrice(product) });
    return true;
  }

  if (req.method === 'POST' && pathname === '/products') {
    const body = await readJson(req);
    if (typeof body.name !== 'string' || !body.name.trim()) throw validation('name is required');
    if (typeof body.sku !== 'string' || !body.sku.trim()) throw validation('sku is required');
    if (typeof body.price !== 'number' || !Number.isFinite(body.price) || body.price < 0) {
      throw validation('price must be a non-negative number');
    }
    const product = db.addProduct({ name: body.name.trim(), sku: body.sku.trim(), price: body.price });
    sendJson(res, 201, { id: product.id, name: product.name, sku: product.sku, price: product.price });
    return true;
  }

  return false;
}

module.exports = { handle };
