'use strict';

const db = require('../db');
const { send, HttpError } = require('../http');

module.exports = function registerProductRoutes(router) {
  router.get('/products', (req, res) => {
    const category = req.query.get('category');
    const items = [...db.products.values()].filter(
      (p) => p.active && (!category || p.category === category),
    );
    send(res, 200, items);
  });

  router.get('/products/:id', (req, res) => {
    const product = db.products.get(Number(req.params.id));
    if (!product || !product.active) throw new HttpError(404, 'product not found');
    send(res, 200, product);
  });
};
