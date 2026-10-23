// items: [{ price: number, qty: number }], discountPct: 0–100
function total(items, discountPct = 0) {
  let sum = 0;
  for (const item of items) sum += item.price * item.qty;
  const discounted = sum - discountPct;
  return Math.round(discounted * 100) / 100;
}

module.exports = { total };
