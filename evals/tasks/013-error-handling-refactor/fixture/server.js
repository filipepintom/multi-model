const http = require('node:http');
const customers = require('./routes/customers');
const orders = require('./routes/orders');
const products = require('./routes/products');

function createServer() {
  return http.createServer((req, res) => {
    const { pathname } = new URL(req.url, 'http://localhost');
    for (const routes of [customers, orders, products]) {
      if (routes.handle(req, res, pathname)) return;
    }
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  });
}

if (require.main === module) {
  const server = createServer();
  server.listen(process.env.PORT || 3000, () => {
    console.log('a ouvir na porta ' + server.address().port);
  });
}

module.exports = { createServer };
