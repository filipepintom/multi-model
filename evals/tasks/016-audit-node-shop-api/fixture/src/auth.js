'use strict';

const crypto = require('crypto');
const { promisify } = require('util');
const db = require('./db');
const { HttpError } = require('./http');

const scrypt = promisify(crypto.scrypt);

const SESSION_TTL_S = 8 * 60 * 60;
const sessions = new Map(); // token -> { userId, expiresAt }

async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const key = await scrypt(password, salt, 64);
  return `${salt.toString('hex')}:${key.toString('hex')}`;
}

async function verifyPassword(password, stored) {
  const [saltHex, keyHex] = stored.split(':');
  const expected = Buffer.from(keyHex, 'hex');
  const actual = await scrypt(password, Buffer.from(saltHex, 'hex'), expected.length);
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

function createSession(userId) {
  const token = crypto.randomBytes(32).toString('base64url');
  const now = Date.now();
  sessions.set(token, { userId, expiresAt: now + SESSION_TTL_S * 1000 });
  pruneExpired(now);
  return token;
}

function pruneExpired(now) {
  for (const [token, session] of sessions) {
    if (session.expiresAt <= now) sessions.delete(token);
  }
}

// Hash computed once and used when the e-mail is unknown, so a failed login
// takes the same time whether or not the account exists.
let dummyHash;
function authenticate(user, password) {
  if (user) return verifyPassword(password, user.passwordHash);
  dummyHash ??= hashPassword(crypto.randomBytes(16).toString('hex'));
  return dummyHash.then((hash) => verifyPassword(password, hash)).then(() => false);
}

function requireAuth(req) {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) throw new HttpError(401, 'authentication required');

  const session = sessions.get(token);
  if (!session || session.expiresAt <= Date.now()) {
    sessions.delete(token);
    throw new HttpError(401, 'session expired or invalid');
  }

  const user = db.users.get(session.userId);
  if (!user) throw new HttpError(401, 'session expired or invalid');
  req.user = user;
}

module.exports = { hashPassword, authenticate, createSession, requireAuth, SESSION_TTL_S };
