'use strict';

process.env.LOG_LEVEL = 'silent';

const { createServer } = require('../src/server');

async function startServer() {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  return {
    base: `http://127.0.0.1:${port}`,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

async function request(base, method, path, { body, token } = {}) {
  const headers = {};
  if (body !== undefined) headers['content-type'] = 'application/json';
  if (token) headers.authorization = `Bearer ${token}`;
  const res = await fetch(base + path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  const isJson = (res.headers.get('content-type') || '').startsWith('application/json');
  return { status: res.status, body: isJson && text ? JSON.parse(text) : text };
}

let counter = 0;
async function signUp(base) {
  counter += 1;
  const email = `cliente${counter}-${Date.now()}@example.com`;
  const password = 'uma-password-longa';
  const created = await request(base, 'POST', '/users', { body: { email, password, name: 'Cliente' } });
  const login = await request(base, 'POST', '/sessions', { body: { email, password } });
  return { user: created.body, token: login.body.token };
}

module.exports = { startServer, request, signUp };
