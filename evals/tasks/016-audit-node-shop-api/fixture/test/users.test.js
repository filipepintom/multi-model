'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startServer, request, signUp } = require('./helpers');

let app;
before(async () => {
  app = await startServer();
});
after(() => app.close());

test('registers a user without exposing the password hash', async () => {
  const res = await request(app.base, 'POST', '/users', {
    body: { email: 'Joana@Example.com', password: 'password-segura-1', name: 'Joana' },
  });
  assert.equal(res.status, 201);
  assert.equal(res.body.email, 'joana@example.com');
  assert.equal(res.body.passwordHash, undefined);
});

test('rejects a duplicate e-mail', async () => {
  const body = { email: 'rui@example.com', password: 'password-segura-2' };
  assert.equal((await request(app.base, 'POST', '/users', { body })).status, 201);
  assert.equal((await request(app.base, 'POST', '/users', { body })).status, 409);
});

test('logs in and reads the profile', async () => {
  const { token, user } = await signUp(app.base);
  assert.ok(token);
  const me = await request(app.base, 'GET', '/users/me', { token });
  assert.equal(me.status, 200);
  assert.equal(me.body.id, user.id);
});

test('refuses a wrong password', async () => {
  await request(app.base, 'POST', '/users', { body: { email: 'ines@example.com', password: 'password-segura-3' } });
  const res = await request(app.base, 'POST', '/sessions', { body: { email: 'ines@example.com', password: 'outra-coisa-qualquer' } });
  assert.equal(res.status, 401);
});

test('protected routes need a token', async () => {
  assert.equal((await request(app.base, 'GET', '/users/me')).status, 401);
  assert.equal((await request(app.base, 'GET', '/cart')).status, 401);
});
