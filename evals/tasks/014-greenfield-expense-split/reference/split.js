// Acerto de contas: saldos em cêntimos inteiros e emparelhamento guloso devedor/credor.
function settle(expenses) {
  const net = new Map(); // cêntimos; positivo = tem a receber

  const add = (name, cents) => net.set(name, (net.get(name) || 0) + cents);

  for (const { paidBy, amount, participants } of expenses) {
    const total = Math.round(amount * 100);
    const n = participants.length;
    if (!n || total === 0) continue;
    const base = Math.floor(total / n);
    let extra = total - base * n; // cêntimos que sobram, distribuídos um a um
    add(paidBy, total);
    for (const p of participants) {
      add(p, -(base + (extra > 0 ? 1 : 0)));
      if (extra > 0) extra--;
    }
  }

  const creditors = [...net].filter(([, v]) => v > 0).map(([name, v]) => ({ name, v })).sort((a, b) => b.v - a.v);
  const debtors = [...net].filter(([, v]) => v < 0).map(([name, v]) => ({ name, v: -v })).sort((a, b) => b.v - a.v);

  const transfers = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const pay = Math.min(debtors[i].v, creditors[j].v);
    transfers.push({ from: debtors[i].name, to: creditors[j].name, amount: pay / 100 });
    debtors[i].v -= pay;
    creditors[j].v -= pay;
    if (debtors[i].v === 0) i++;
    if (creditors[j].v === 0) j++;
  }
  return transfers;
}

module.exports = { settle };
