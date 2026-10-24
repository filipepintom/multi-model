'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startServer, request } = require('./helpers');

let app;
before(async () => {
  app = await startServer();
});
after(() => app.close());

test('health and version', async () => {
  assert.equal((await request(app.base, 'GET', '/health')).body.status, 'ok');
  const version = await request(app.base, 'GET', '/version');
  assert.equal(version.body.name, 'shop-api');
});

test('downloads a product manual', async () => {
  const res = await request(app.base, 'GET', '/files?name=k200-manual.txt');
  assert.equal(res.status, 200);
  assert.match(res.body, /K200/);
});

test('missing manual is a 404', async () => {
  assert.equal((await request(app.base, 'GET', '/files?name=nao-existe.pdf')).status, 404);
});

test('serves static assets', async () => {
  const res = await request(app.base, 'GET', '/assets/styles.css');
  assert.equal(res.status, 200);
  assert.match(res.body, /font-family/);
});
