'use strict';

const crypto = require('crypto');

class PaymentError extends Error {
  constructor(code) {
    super(code);
    this.name = 'PaymentError';
    this.code = code;
  }
}

// Client for the card payment provider, pointed at the provider's sandbox in
// this environment: tokens "tok_*" are accepted, "tok_declined" is refused.
async function capture({ amount, currency, token, reference }) {
  await new Promise((resolve) => setTimeout(resolve, 10));
  if (typeof token !== 'string' || !token.startsWith('tok_')) throw new PaymentError('invalid_card_token');
  if (token === 'tok_declined') throw new PaymentError('card_declined');
  if (!(amount > 0)) throw new PaymentError('invalid_amount');
  return {
    id: `cap_${crypto.randomBytes(8).toString('hex')}`,
    amount,
    currency,
    reference,
    status: 'captured',
  };
}

module.exports = { capture, PaymentError };
