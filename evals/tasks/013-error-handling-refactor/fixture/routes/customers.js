const db = require('../db');

function json(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}

function readBody(req, cb) {
  let raw = '';
  req.on('data', (chunk) => { raw += chunk; });
  req.on('end', () => cb(raw));
}

function handle(req, res, pathname) {
  let m;

  if (req.method === 'GET' && pathname === '/customers') {
    json(res, 200, db.listCustomers());
    return true;
  }

  if (req.method === 'GET' && (m = pathname.match(/^\/customers\/(\d+)$/))) {
    const customer = db.getCustomer(Number(m[1]));
    if (!customer) {
      json(res, 200, { error: 'Customer not found' });
    } else {
      json(res, 200, customer);
    }
    return true;
  }

  if (req.method === 'POST' && pathname === '/customers') {
    readBody(req, (raw) => {
      let body;
      try {
        body = JSON.parse(raw);
      } catch (e) {
        return json(res, 400, { error: 'invalid json' });
      }
      if (!body || typeof body.name !== 'string' || !body.name.trim()) {
        return json(res, 400, { error: 'name is required' });
      }
      if (typeof body.email !== 'string' || !body.email.includes('@')) {
        return json(res, 400, { error: 'a valid email is required' });
      }
      if (db.findCustomerByEmail(body.email)) {
        return json(res, 400, { error: 'email already registered' });
      }
      json(res, 201, db.addCustomer({ name: body.name.trim(), email: body.email }));
    });
    return true;
  }

  return false;
}

module.exports = { handle };
