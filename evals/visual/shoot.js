#!/usr/bin/env node
// Fotografa o index.html de um workspace num Chrome real, sem dependências:
//
//   node evals/visual/shoot.js <workspace> <pasta-de-saída>
//
// Gera desktop-1.png, desktop-2.png… (1440x900) e mobile-1.png… (390x844): um ecrã de cada vez, com scroll real.
// Uma captura da página inteira mente: elementos fixos pintam por cima do conteúdo e o que aparece ao fazer scroll fica
// por revelar. Uma página de 4900 px com uma moldura fixa saiu com 1400 px em branco e perdeu o júri por isso.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const CHROMES = [
  process.env.CHROME,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean);
const MAX_FRAMES = 8;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function startChrome() {
  const exe = CHROMES.find((c) => fs.existsSync(c));
  if (!exe) throw new Error('Chrome não encontrado; define CHROME com o caminho do executável');
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'visual-chrome-'));
  const proc = spawn(exe, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run', '--hide-scrollbars', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
  const stop = () => { proc.kill(); setTimeout(() => fs.rmSync(profile, { recursive: true, force: true }), 500).unref(); };
  return new Promise((resolve, reject) => {
    let log = '';
    proc.on('exit', () => reject(new Error(`o Chrome terminou antes de arrancar: ${log.slice(-300)}`)));
    proc.stderr.on('data', (d) => {
      log += d;
      const url = /ws:\/\/\S+/.exec(log)?.[0];
      if (url) resolve({ url, stop });
    });
  });
}

function connect(url) {
  const ws = new WebSocket(url);
  let id = 0;
  const pending = new Map();
  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data);
    if (!pending.has(msg.id)) return;
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    if (msg.error) reject(new Error(msg.error.message)); else resolve(msg.result);
  };
  const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
    pending.set(++id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params, sessionId }));
  });
  return new Promise((resolve) => { ws.onopen = () => resolve({ send, close: () => ws.close() }); });
}

async function shoot(ws, out) {
  const page = path.join(ws, 'index.html');
  if (!fs.existsSync(page)) throw new Error(`não existe ${page}`);
  fs.mkdirSync(out, { recursive: true });
  const chrome = await startChrome();
  const cdp = await connect(chrome.url);
  try {
    const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
    const on = (method, params) => cdp.send(method, params, sessionId);
    await on('Page.enable');

    const view = async (width, height, mobile) => {
      await on('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: mobile ? 2 : 1, mobile });
      await on('Page.navigate', { url: `file://${page}` });
      await sleep(2000); // tipos de letra da web e animações de entrada
    };
    const evaluate = async (expression) => (await on('Runtime.evaluate', { expression, returnByValue: true })).result.value;
    const frames = async (name, height) => {
      const total = await evaluate('document.documentElement.scrollHeight');
      const count = Math.min(Math.ceil(total / height), MAX_FRAMES);
      for (let i = 0; i < count; i++) {
        await evaluate(`window.scrollTo(0, ${Math.min(i * height, total - height)})`);
        await sleep(1000); // animações à entrada do ecrã
        const { data } = await on('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(path.join(out, `${name}-${i + 1}.png`), Buffer.from(data, 'base64'));
      }
    };

    await view(1440, 900, false);
    await frames('desktop', 900);
    await view(390, 844, true);
    await frames('mobile', 844);
  } finally {
    cdp.close();
    chrome.stop();
  }
}

module.exports = { shoot };

if (require.main === module) {
  const [ws, out] = process.argv.slice(2);
  if (!ws || !out) {
    console.error('uso: node evals/visual/shoot.js <workspace> <pasta-de-saída>');
    process.exit(2);
  }
  shoot(path.resolve(ws), path.resolve(out)).then(() => process.exit(0), (e) => { console.error(e.message); process.exit(1); });
}
