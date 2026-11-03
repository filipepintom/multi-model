const db = require('./db');

const STATUSES = ['created', 'paid', 'shipped', 'refunded'];

function getOrder(id) {
  return db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
}

function updateStatus(id, status) {
  if (!STATUSES.includes(status)) throw new Error(`invalid status: ${status}`);
  db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, id);
  return getOrder(id);
}

module.exports = { getOrder, updateStatus };
