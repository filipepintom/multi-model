const db = require('./db');

// The refund and the status change have to commit together, so this does not go through orders.js.
const refund = db.transaction((orderId, amountCents) => {
  db.prepare('INSERT INTO refunds (order_id, amount_cents) VALUES (?, ?)').run(orderId, amountCents);
  db.prepare("UPDATE orders SET status = 'refunded' WHERE id = ?").run(orderId);
});

module.exports = { refund };
