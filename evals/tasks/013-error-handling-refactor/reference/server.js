const http = require('node:http');
const { notFound, sendError } = require('./errors');
const customers = require('./routes/customers');
const orders = require('./routes/orders');
const products = require('./routes/products');

function createServer() {
  return http.createServer(async (req, res) => {
    try {
      const { pathname } = new URL(req.url, 'http://localhost');
      for (const routes of [customers, orders, products]) {
        if (await routes.handle(req, res, pathname)) return;
      }
      throw notFound(`Route ${req.method} ${pathname} not found`);
    } catch (err) {
      sendError(res, err);
    }
  });
}

if (require.main === module) {
  const server = createServer();
  server.listen(process.env.PORT || 3000, () => {
    console.log('a ouvir na porta ' + server.address().port);
  });
}

module.exports = { createServer };
