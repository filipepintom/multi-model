'use strict';

const db = require('../db');
const { send, HttpError } = require('../http');
const { readJson } = require('../middleware/body');
const { hashPassword, authenticate, createSession, requireAuth, SESSION_TTL_S } = require('../auth');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function publicUser(user) {
  const { passwordHash, ...rest } = user;
  return rest;
}

module.exports = function registerUserRoutes(router) {
  router.post('/users', async (req, res) => {
    const { email, password, name } = await readJson(req);
    const normalized = typeof email === 'string' ? email.trim().toLowerCase() : '';
    if (!EMAIL_RE.test(normalized)) throw new HttpError(400, 'invalid email');
    if (typeof password !== 'string' || password.length < 10 || password.length > 200) {
      throw new HttpError(400, 'password must have between 10 and 200 characters');
    }

    const passwordHash = await hashPassword(password);
    if (db.findUserByEmail(normalized)) throw new HttpError(409, 'email already registered');

    const user = {
      id: db.nextId('user'),
      email: normalized,
      name: typeof name === 'string' ? name.trim().slice(0, 100) : '',
      passwordHash,
      createdAt: new Date().toISOString(),
    };
    db.users.set(user.id, user);
    db.wallets.set(user.id, { balance: 0, ledger: [] });
    send(res, 201, publicUser(user));
  });

  router.post('/sessions', async (req, res) => {
    const { email, password } = await readJson(req);
    if (typeof email !== 'string' || typeof password !== 'string') {
      throw new HttpError(400, 'email and password are required');
    }
    const user = db.findUserByEmail(email.trim().toLowerCase());
    const ok = await authenticate(user, password);
    if (!ok) throw new HttpError(401, 'invalid credentials');
    send(res, 201, { token: createSession(user.id), expiresIn: SESSION_TTL_S });
  });

  router.get('/users/me', requireAuth, (req, res) => {
    send(res, 200, publicUser(req.user));
  });

  router.get('/wallet', requireAuth, (req, res) => {
    const wallet = db.wallets.get(req.user.id);
    send(res, 200, { balance: wallet.balance, ledger: wallet.ledger.slice(-50) });
  });
};
