const { test, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');

let server;
let hits;
let failFirst;

before(async () => {
  server = http.createServer((req, res) => {
    const base = new URL(req.url, 'http://x').searchParams.get('base');
    hits[base] = (hits[base] || 0) + 1;
    if (base === 'NOPE') { res.writeHead(404); return res.end(); }
    if (failFirst[base] && hits[base] === 1) { res.writeHead(500); return res.end(); }
    if (failFirst[base] === 'always') { res.writeHead(503); return res.end(); }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ base, rates: { USD: 1.1, GBP: 0.8567 } }));
  });
  await new Promise((r) => server.listen(0, r));
  process.env.RATES_API_URL = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());

const { convert } = require('./convert');
const reset = () => { hits = {}; failFirst = {}; };

test('converte e arredonda a 2 casas', async () => {
  reset();
  assert.strictEqual(await convert(100, 'EUR', 'GBP'), 85.67);
  assert.strictEqual(await convert(10, 'EUR', 'USD'), 11);
});

test('mesma moeda não chama o serviço', async () => {
  reset();
  assert.strictEqual(await convert(5, 'AAA', 'AAA'), 5);
  assert.strictEqual(hits.AAA, undefined);
});

test('cache por base', async () => {
  reset();
  await convert(1, 'CCC', 'USD');
  await convert(1, 'CCC', 'GBP');
  assert.strictEqual(hits.CCC, 1);
});

test('repete uma vez em 5xx e depois lança', async () => {
  reset();
  failFirst.DDD = true;
  assert.strictEqual(await convert(10, 'DDD', 'USD'), 11);
  assert.strictEqual(hits.DDD, 2);
  failFirst.EEE = 'always';
  await assert.rejects(convert(10, 'EEE', 'USD'));
  assert.strictEqual(hits.EEE, 2);
});

test('4xx e moeda desconhecida lançam erro', async () => {
  reset();
  await assert.rejects(convert(1, 'NOPE', 'USD'));
  assert.strictEqual(hits.NOPE, 1);
  await assert.rejects(convert(1, 'FFF', 'ZZZ'), Error);
});
