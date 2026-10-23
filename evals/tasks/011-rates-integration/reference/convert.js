const TTL_MS = 60 * 1000;
const cache = new Map(); // base -> { rates, expires }

async function fetchRates(base) {
  const url = `${process.env.RATES_API_URL}/latest?base=${encodeURIComponent(base)}`;
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch(url);
    if (res.ok) return (await res.json()).rates;
    if (res.status < 500) throw new Error(`rates API respondeu ${res.status}`);
    if (attempt === 1) throw new Error(`rates API respondeu ${res.status}`);
  }
}

async function getRates(base) {
  const hit = cache.get(base);
  if (hit && hit.expires > Date.now()) return hit.rates;
  const rates = await fetchRates(base);
  cache.set(base, { rates, expires: Date.now() + TTL_MS });
  return rates;
}

async function convert(amount, from, to) {
  if (from === to) return amount;
  const rates = await getRates(from);
  const rate = rates[to];
  if (typeof rate !== 'number') throw new Error(`moeda desconhecida: ${to}`);
  return Math.round(amount * rate * 100) / 100;
}

module.exports = { convert };
