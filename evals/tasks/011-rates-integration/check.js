// Check escondido: copiado para o workspace só depois do agente terminar.
const assert = require('assert');
const fs = require('fs');
const http = require('http');
const net = require('net');
const path = require('path');
const { spawnSync } = require('child_process');

// Servidor de mentira: conta pedidos por base e pode falhar conforme o modo.
const TABLES = {
  EUR: { USD: 1.1, GBP: 0.8567, JPY: 161.2 },
  USD: { EUR: 0.9 },
  GBP: { EUR: 1.17 },
  SEK: { USD: 0.09, EUR: 0.085 },
  CAD: { EUR: 0.68 },
  CHF: { EUR: 1.04 },
  NZD: { EUR: 0.55 },
};
const state = {}; // base -> { mode, count }
const reqLog = [];
function st(base) {
  if (!state[base]) state[base] = { mode: 'ok', count: 0 };
  return state[base];
}

function startMock() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const u = new URL(req.url, 'http://mock');
      reqLog.push(req.url);
      if (u.pathname !== '/latest') { res.writeHead(404); return res.end('{}'); }
      const base = u.searchParams.get('base');
      const s = st(base);
      s.count++;
      const json = (code, body) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(body)); };
      if (!TABLES[base]) return json(404, { error: 'unknown base' });
      if (s.mode === 'fail-always') return json(500, { error: 'boom' });
      if (s.mode === 'fail-once-503' && s.count === 1) return json(503, { error: 'unavailable' });
      if (s.mode === 'fail-once-500' && s.count === 1) return json(500, { error: 'boom' });
      json(200, { base, rates: TABLES[base] });
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

function freePort() {
  return new Promise((resolve) => {
    const s = net.createServer().listen(0, () => {
      const { port } = s.address();
      s.close(() => resolve(port));
    });
  });
}

(async () => {
  const mock = await startMock();
  try {
    process.env.RATES_API_URL = `http://127.0.0.1:${mock.address().port}`;
    const mod = require(path.resolve('convert.js'));
    assert.strictEqual(typeof mod.convert, 'function', 'convert.js tem de exportar { convert }');
    const { convert } = mod;

    // conversão e arredondamento + cache por base
    assert.strictEqual(await convert(10, 'EUR', 'USD'), 11, '10 EUR -> USD (1.1)');
    assert.strictEqual(st('EUR').count, 1, 'primeira conversão chama o serviço uma vez');
    assert.strictEqual(await convert(100, 'EUR', 'GBP'), 85.67, '100 EUR -> GBP');
    assert.strictEqual(await convert(19.99, 'EUR', 'JPY'), 3222.39, '19.99 EUR -> JPY arredondado a 2 casas');
    assert.strictEqual(await convert(10, 'EUR', 'USD'), 11, 'repetição');
    assert.strictEqual(st('EUR').count, 1, 'dentro dos 60 s a mesma base não volta ao serviço (também para destinos diferentes)');
    assert.strictEqual(typeof (await convert(1, 'EUR', 'USD')), 'number', 'devolve um número');
    assert.ok(reqLog.every((l) => /^\/latest\?base=[A-Z]{3}$/.test(l)), `o pedido ao serviço devia ser /latest?base=<FROM>, vieram: ${reqLog.join(', ')}`);

    // outra base -> novo pedido, e a cache da primeira mantém-se
    assert.strictEqual(await convert(50, 'USD', 'EUR'), 45, '50 USD -> EUR (0.9)');
    assert.strictEqual(st('USD').count, 1, 'outra base chama o serviço');
    assert.strictEqual(st('EUR').count, 1, 'a cache de EUR mantém-se');
    await convert(1, 'USD', 'EUR');
    assert.strictEqual(st('USD').count, 1, 'cache de USD');

    // mesma moeda: sem chamar o serviço
    assert.strictEqual(await convert(100, 'CHF', 'CHF'), 100, 'mesma moeda devolve o valor');
    assert.strictEqual(await convert(12.5, 'CHF', 'CHF'), 12.5, 'mesma moeda devolve o valor (decimal)');
    assert.strictEqual(st('CHF').count, 0, 'mesma moeda não chama o serviço');
    assert.strictEqual(await convert(7, 'QQQ', 'QQQ'), 7, 'mesma moeda, mesmo desconhecida pelo serviço');
    assert.strictEqual(st('QQQ').count, 0, 'mesma moeda não chama o serviço (QQQ)');

    // 5xx uma vez: repete exatamente uma vez e depois funciona
    st('GBP').mode = 'fail-once-503';
    assert.strictEqual(await convert(10, 'GBP', 'EUR'), 11.7, 'recupera após um 503');
    assert.strictEqual(st('GBP').count, 2, 'um 503 => exatamente uma repetição (2 pedidos)');
    await convert(10, 'GBP', 'EUR');
    assert.strictEqual(st('GBP').count, 2, 'o resultado da repetição fica em cache');

    st('NZD').mode = 'fail-once-500';
    assert.strictEqual(await convert(100, 'NZD', 'EUR'), 55, 'recupera após um 500');
    assert.strictEqual(st('NZD').count, 2, 'um 500 => exatamente uma repetição');

    // 5xx sempre: lança depois de exatamente 2 pedidos
    st('CAD').mode = 'fail-always';
    let err;
    try { await convert(10, 'CAD', 'EUR'); } catch (e) { err = e; }
    assert.ok(err, 'com o serviço sempre a falhar com 5xx, convert devia lançar');
    assert.ok(err instanceof Error, 'o erro devia ser um Error');
    assert.strictEqual(st('CAD').count, 2, 'sempre 5xx => 1 pedido + exatamente 1 repetição (2 pedidos), vieram ' + st('CAD').count);

    // 4xx: lança sem repetir
    err = undefined;
    try { await convert(10, 'XXX', 'EUR'); } catch (e) { err = e; }
    assert.ok(err instanceof Error, 'base desconhecida (404) devia lançar um Error');
    assert.strictEqual(st('XXX').count, 1, '4xx não se repete');

    // moeda de destino desconhecida
    err = undefined;
    try { await convert(10, 'SEK', 'ZZZ'); } catch (e) { err = e; }
    assert.ok(err instanceof Error, 'moeda de destino desconhecida devia lançar um Error');
    assert.strictEqual(st('SEK').count, 1, 'destino desconhecido: 1 pedido, sem repetições');
    assert.strictEqual(await convert(100, 'SEK', 'USD'), 9, 'a base continua utilizável depois do erro');
    assert.strictEqual(st('SEK').count, 1, 'as taxas da base ficaram em cache');
  } finally {
    mock.close();
    mock.closeAllConnections && mock.closeAllConnections();
  }

  // testes: têm de existir, não podem depender do serviço real, e têm de passar
  const testFiles = fs.readdirSync('.').filter((f) => /\.test\.js$/.test(f) || /^test.*\.js$/.test(f));
  assert.ok(testFiles.length > 0, 'não existem ficheiros de teste');
  const allTests = testFiles.map((f) => fs.readFileSync(f, 'utf8')).join('\n');
  assert.ok(/convert/.test(allTests), 'os testes não mencionam convert');
  const dead = await freePort(); // porta sem ninguém à escuta: simula o serviço real inacessível
  const t = spawnSync('npm test', {
    shell: true,
    encoding: 'utf8',
    timeout: 50000,
    env: { ...process.env, RATES_API_URL: `http://127.0.0.1:${dead}` },
  });
  assert.strictEqual(t.status, 0, `npm test falhou (os testes não podem depender do serviço real):\n${t.stdout}\n${t.stderr}`);
  console.log('ok');
})().then(() => process.exit(0), (e) => {
  console.error(e.message || e);
  process.exit(1);
});
