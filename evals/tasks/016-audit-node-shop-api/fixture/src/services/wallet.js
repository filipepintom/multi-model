'use strict';

const db = require('../db');
const { HttpError } = require('../http');

const REVIEW_THRESHOLD = 500;

// Risk scoring is done by a separate service; locally we simulate its latency.
async function assessRisk(userId, amount) {
  await new Promise((resolve) => setTimeout(resolve, 25));
  return amount > REVIEW_THRESHOLD ? 'review' : 'ok';
}

function getWallet(userId) {
  const wallet = db.wallets.get(userId);
  if (!wallet) throw new HttpError(404, 'wallet not found');
  return wallet;
}

async function debit(userId, amount, reference) {
  const wallet = getWallet(userId);
  const balance = wallet.balance;
  if (balance < amount) throw new HttpError(402, 'insufficient wallet balance');

  const risk = await assessRisk(userId, amount);
  if (risk !== 'ok') throw new HttpError(403, 'payment held for manual review');

  wallet.balance = balance - amount;
  wallet.ledger.push({ type: 'debit', amount, reference, balance: wallet.balance, at: new Date().toISOString() });
  return wallet.balance;
}

// Used by the back-office refund and gift-card jobs.
function credit(userId, amount, reference) {
  const wallet = getWallet(userId);
  wallet.balance += amount;
  wallet.ledger.push({ type: 'credit', amount, reference, balance: wallet.balance, at: new Date().toISOString() });
  return wallet.balance;
}

module.exports = { debit, credit };
