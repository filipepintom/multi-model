const db = require('../db');
const { notFound, validation, conflict, readJson, sendJson } = require('../errors');

async function handle(req, res, pathname) {
  let m;

  if (req.method === 'GET' && pathname === '/customers') {
    sendJson(res, 200, db.listCustomers());
    return true;
  }

  if (req.method === 'GET' && (m = pathname.match(/^\/customers\/(\d+)$/))) {
    const customer = db.getCustomer(Number(m[1]));
    if (!customer) throw notFound(`Customer ${m[1]} not found`);
    sendJson(res, 200, customer);
    return true;
  }

  if (req.method === 'POST' && pathname === '/customers') {
    const body = await readJson(req);
    if (typeof body.name !== 'string' || !body.name.trim()) throw validation('name is required');
    if (typeof body.email !== 'string' || !body.email.includes('@')) throw validation('a valid email is required');
    if (db.findCustomerByEmail(body.email)) throw conflict('email already registered');
    sendJson(res, 201, db.addCustomer({ name: body.name.trim(), email: body.email }));
    return true;
  }

  return false;
}

module.exports = { handle };
