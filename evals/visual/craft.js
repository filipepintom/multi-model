#!/usr/bin/env node
// Mede o que o júri de capturas não vê: movimento, feedback ao premir, base para telemóvel e robustez do layout.
//
//   node evals/visual/craft.js <workspace> [<pasta-de-saída>]
//
// Lê o CSS, o JS e o HTML do workspace e abre o index.html num Chrome real. Escreve craft.json na pasta de saída
// (se for dada) e imprime um resumo. Com --frames grava também sequências de ecrãs de três momentos (carregar,
// premir o primeiro botão de ação, premir um filtro), para se ver o movimento quadro a quadro.
//
// As regras vêm das skills de Emil Kowalski (MIT, github.com/emilkowalski/skills, commit 64eb3de): a lista do que
// nunca se entrega, o feedback obrigatório e a base de uma app web num telemóvel. O resultado não premeia quantidade
// de animação: conta violações e o que falta.

const fs = require('fs');
const path = require('path');
const { startChrome, connect, sleep } = require('./shoot.js');

const SKIP_DIR = /^(node_modules|\.git|docs|\.studio|\.claude|\.impeccable|tests?|__tests__|coverage|design-system)$/;

function files(dir, re, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.eval-')) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (!SKIP_DIR.test(e.name)) files(p, re, out); } else if (re.test(e.name) && !/\.(test|spec)\./.test(e.name)) out.push(p);
  }
  return out;
}

// Regras CSS com os @-blocos que as envolvem. Suficiente para saber se um :hover está dentro de @media (hover: hover).
function rules(css) {
  const text = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const out = [];
  const stack = [];
  let i = 0;
  let start = 0;
  while (i < text.length) {
    const c = text[i];
    if (c === '{') {
      const prelude = text.slice(start, i).trim();
      if (prelude.startsWith('@') && !/^@(font-face|page|property|counter-style)/.test(prelude) && !/^@keyframes/.test(prelude)) {
        stack.push(prelude);
        start = i + 1;
      } else {
        let depth = 1;
        let j = i + 1;
        while (j < text.length && depth) { if (text[j] === '{') depth++; else if (text[j] === '}') depth--; j++; }
        out.push({ selector: prelude, body: text.slice(i + 1, j - 1), at: [...stack] });
        i = j - 1;
        start = j;
      }
    } else if (c === '}') {
      stack.pop();
      start = i + 1;
    }
    i++;
  }
  return out;
}

function analyse(ws) {
  const html = files(ws, /\.html?$/i).map((f) => fs.readFileSync(f, 'utf8')).join('\n');
  const css = [...files(ws, /\.css$/i).map((f) => fs.readFileSync(f, 'utf8')), ...[...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1])].join('\n');
  const js = [...files(ws, /\.(m?js)$/i).map((f) => fs.readFileSync(f, 'utf8')), ...[...html.matchAll(/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1])].join('\n');
  const rs = rules(css);
  const gated = (r) => r.at.some((a) => /hover\s*:\s*hover/.test(a));
  const reduced = (r) => r.at.some((a) => /prefers-reduced-motion/.test(a));
  const moves = (body) => /\b(transform|translate|scale|rotate)\s*:/.test(body);
  const hover = rs.filter((r) => /:hover/.test(r.selector));
  const active = rs.filter((r) => /:active/.test(r.selector));
  const live = rs.filter((r) => !reduced(r));
  const transitions = live.flatMap((r) => [...r.body.matchAll(/\btransition(?:-property)?\s*:\s*([^;}]+)/g)].map((m) => m[1].trim()));
  const timings = live.flatMap((r) => [...r.body.matchAll(/\b(?:transition|animation)(?:-timing-function)?\s*:\s*([^;}]+)/g)].map((m) => m[1]));
  const durations = live.flatMap((r) => [...r.body.matchAll(/\b(?:transition|animation)(?:-duration)?\s*:\s*([^;}]+)/g)]
    .flatMap((m) => [...m[1].matchAll(/(?<![\w.-])(\d*\.?\d+)(ms|s)\b/g)].map((d) => Number(d[1]) * (d[2] === 's' ? 1000 : 1))));
  const hasMotion = transitions.length > 0 || /@keyframes/.test(css) || /\.animate\(/.test(js);

  const never = {
    transition_all: transitions.filter((t) => /(^|,)\s*all\b/.test(t)).length,
    scale_zero: (css.match(/scale\(\s*0(\.0+)?\s*\)/g) || []).length,
    ease_in: timings.filter((t) => /\bease-in\b(?!-out)/.test(t)).length,
    layout_properties: transitions.filter((t) => /(^|,|\s)(width|height|max-height|margin|padding|top|left|right|bottom)\b/.test(t.replace(/cubic-bezier\([^)]*\)/g, ''))).length,
    ungated_hover_motion: hover.filter((r) => !gated(r) && moves(r.body)).length,
    no_reduced_motion: hasMotion && !/prefers-reduced-motion/.test(css + js) ? 1 : 0,
    zoom_disabled: /user-scalable\s*=\s*no|maximum-scale\s*=\s*1(\.0)?\b/.test(html) ? 1 : 0,
  };
  const facts = {
    transitions: transitions.length,
    keyframes: (css.match(/@keyframes/g) || []).length,
    waapi: (js.match(/\.animate\(/g) || []).length,
    longest_ms: durations.length ? Math.max(...durations) : 0,
    over_300ms: durations.filter((d) => d > 300).length,
    hover_rules: hover.length,
    hover_ungated: hover.filter((r) => !gated(r)).length,
    active_rules: active.length,
    active_with_scale: active.filter((r) => /scale\(\s*0\.9\d*\s*\)/.test(r.body)).length,
    custom_easing: (css.match(/cubic-bezier\(/g) || []).length,
  };
  const present = {
    press_rule: active.length > 0,
    focus_visible: /:focus-visible/.test(css),
    reduced_motion: /prefers-reduced-motion/.test(css + js),
    hover_gate: hover.length === 0 || hover.some(gated),
    tabular_nums: /tabular-nums/.test(css),
    viewport_fit: /viewport-fit\s*=\s*cover/.test(html),
    theme_color_per_scheme: (html.match(/<meta[^>]+name=["']theme-color["'][^>]*media=|<meta[^>]+media=[^>]*name=["']theme-color["']/gi) || []).length >= 2,
    tap_highlight: /-webkit-tap-highlight-color/.test(css),
    touch_action: /touch-action\s*:\s*manipulation/.test(css),
    dynamic_viewport: /\b100(dvh|svh)\b/.test(css) || !/\b100vh\b/.test(css),
  };
  return { never, facts, present };
}

async function probe(ws, out, frames) {
  const page = path.join(ws, 'index.html');
  const chrome = await startChrome();
  const cdp = await connect(chrome.url);
  const result = { overflow: {}, targets: {}, press: null, animations: {}, boxes: {}, frames: {} };
  try {
    const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
    const on = (method, params) => cdp.send(method, params, sessionId).catch((e) => { throw new Error(`${method}: ${e.message}`); });
    const evaluate = async (expression) => (await on('Runtime.evaluate', { expression, returnByValue: true })).result.value;
    await on('Page.enable');
    const view = async (width, height, mobile) => {
      await on('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: mobile ? 2 : 1, mobile });
      await on('Page.navigate', { url: `file://${page}` });
      await sleep(1500);
    };
    // 720 de largura é o ecrã de 1440 com o zoom do browser a 200%.
    for (const [name, width, mobile] of [['320', 320, true], ['390', 390, true], ['zoom200', 720, false], ['1440', 1440, false]]) {
      await view(width, 900, mobile);
      result.overflow[name] = await evaluate('document.documentElement.scrollWidth - window.innerWidth');
    }
    await view(390, 844, true);
    result.targets = await evaluate(`(() => {
      const seen = [...document.querySelectorAll('button, a[href], input, select, textarea, [role="button"], summary')].filter((e) => {
        const r = e.getBoundingClientRect(); const s = getComputedStyle(e);
        return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && e.type !== 'hidden';
      });
      const small = seen.filter((e) => { const r = e.getBoundingClientRect(); return Math.min(r.width, r.height) < 44; });
      const fields = seen.filter((e) => /^(INPUT|SELECT|TEXTAREA)$/.test(e.tagName) && !/^(checkbox|radio|range|button|submit)$/.test(e.type));
      return { total: seen.length, under_44: small.length, fields: fields.length, fields_under_16px: fields.filter((e) => parseFloat(getComputedStyle(e).fontSize) < 16).length };
    })()`);

    // Feedback ao premir: o estilo do primeiro botão visível muda enquanto o rato está em baixo?
    await view(1440, 900, false);
    const FIND = (re) => `(() => { const all = [...document.querySelectorAll('button, [role="button"]'), ...document.querySelectorAll('label, a[href]')]; const e = all.find((x) => { const r = x.getBoundingClientRect(); return r.width > 0 && r.height > 0 && ${re}.test((x.textContent || '') + ' ' + (x.getAttribute('aria-label') || '')); }); if (!e) return null; e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(); window.__probe = e; return { x: r.left + r.width / 2, y: r.top + r.height / 2, text: (e.textContent || '').trim().slice(0, 40) }; })()`;
    const STYLE = `(() => { const s = getComputedStyle(window.__probe); return [s.transform, s.backgroundColor, s.boxShadow, s.opacity, s.filter, s.color, s.borderColor, s.scale, s.translate].join('|'); })()`;
    const mouse = (type, p) => on('Input.dispatchMouseEvent', { type, x: p.x, y: p.y, button: 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1 });
    const shot = async (dir, name) => {
      // Logo a seguir a um navigate a página ainda não está ativa: tenta outra vez em vez de falhar a sequência.
      let data;
      for (let n = 0; n < 8 && !data; n++) {
        try { ({ data } = await on('Page.captureScreenshot', { format: 'jpeg', quality: 70 })); } catch { await sleep(40); }
      }
      if (!data) return;
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, name), Buffer.from(data, 'base64'));
    };
    const any = await evaluate(FIND('/./'));
    if (any) {
      await mouse('mouseMoved', { x: 2, y: 2 });
      await sleep(250);
      const before = await evaluate(STYLE);
      await mouse('mouseMoved', any);
      await sleep(300);
      const hovered = await evaluate(STYLE);
      await mouse('mousePressed', any);
      await sleep(220);
      const pressed = await evaluate(STYLE);
      await mouse('mouseMoved', { x: 2, y: 2 });
      await mouse('mouseReleased', { x: 2, y: 2 });
      result.press = { on: any.text, hover_changes: hovered !== before, press_changes: pressed !== hovered };
    }

    // Depois de premir a ação (e o filtro), há alguma animação ou transição a correr? É a mudança de estado animada.
    const after = async (re) => {
      await view(1440, 900, false);
      const p = await evaluate(FIND(re));
      if (!p) return null;
      await mouse('mouseMoved', p);
      await mouse('mousePressed', p);
      await mouse('mouseReleased', p);
      let most = 0;
      for (let n = 0; n < 6; n++) { await sleep(35); most = Math.max(most, await evaluate('document.getAnimations().length')); }
      return most;
    };
    result.animations = { action: await after('/pronta|ready|conclu|marcar|done/i'), filter: await after('/in[eê]s|tom[aá]s/i') };

    // Caixas dos elementos em repouso, para comparar um ecrã antes e depois de uma alteração que não devia mexer no layout.
    const BOXES = `[...document.body.querySelectorAll('*')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && !/^(SCRIPT|STYLE|BR)$/.test(e.tagName); }).map((e) => { const r = e.getBoundingClientRect(); return [e.tagName, Math.round(r.left + scrollX), Math.round(r.top + scrollY), Math.round(r.width), Math.round(r.height)]; })`;
    result.boxes = {};
    for (const [name, width, mobile] of [['1440', 1440, false], ['390', 390, true]]) {
      await view(width, 900, mobile);
      result.boxes[name] = await evaluate(BOXES);
    }

    if (frames && out) {
      const sequence = async (name, re, count, gap) => {
        await view(1440, 900, false);
        const dir = path.join(out, 'frames', name);
        if (!re) {
          await on('Page.navigate', { url: `file://${page}` });
          for (let i = 0; i < count; i++) { await shot(dir, `${String(i).padStart(2, '0')}.jpg`); await sleep(gap); }
          return count;
        }
        const p = await evaluate(FIND(re));
        if (!p) return 0;
        await sleep(300);
        await shot(dir, '00.jpg');
        await mouse('mouseMoved', p);
        await sleep(120);
        await shot(dir, '01.jpg');
        await mouse('mousePressed', p);
        await sleep(90);
        await shot(dir, '02.jpg');
        await mouse('mouseReleased', p);
        for (let i = 3; i < count; i++) { await shot(dir, `${String(i).padStart(2, '0')}.jpg`); await sleep(gap); }
        return count;
      };
      result.frames.load = await sequence('load', null, 8, 70);
      result.frames.action = await sequence('action', '/pronta|ready|conclu|marcar|done/i', 12, 60);
      result.frames.filter = await sequence('filter', '/in[eê]s|tom[aá]s/i', 12, 60);
    }
  } finally {
    cdp.close();
    chrome.stop();
  }
  return result;
}

async function craft(ws, out, { frames = false } = {}) {
  const a = analyse(ws);
  const p = await probe(ws, out, frames);
  const present = {
    ...a.present,
    press_feedback: Boolean(p.press && p.press.press_changes),
    targets_44: p.targets.total > 0 && p.targets.under_44 / p.targets.total <= 0.1,
    fields_16px: p.targets.fields_under_16px === 0,
    fits_320: p.overflow['320'] <= 0,
    fits_390: p.overflow['390'] <= 0,
    fits_zoom200: p.overflow.zoom200 <= 0,
  };
  const violations = Object.values(a.never).reduce((n, x) => n + x, 0);
  const missing = Object.entries(present).filter(([, ok]) => !ok).map(([k]) => k);
  const report = { violations, never: a.never, present_count: Object.keys(present).length - missing.length, of: Object.keys(present).length, missing, facts: a.facts, press: p.press, animations: p.animations, targets: p.targets, overflow: p.overflow, frames: p.frames, boxes: p.boxes };
  if (out) { fs.mkdirSync(out, { recursive: true }); fs.writeFileSync(path.join(out, 'craft.json'), JSON.stringify(report, null, 2)); }
  return report;
}

module.exports = { craft, analyse };

if (require.main === module) {
  const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  if (!args[0]) { console.error('uso: node evals/visual/craft.js <workspace> [<pasta-de-saída>] [--frames]'); process.exit(2); }
  craft(path.resolve(args[0]), args[1] && path.resolve(args[1]), { frames: process.argv.includes('--frames') }).then((r) => {
    console.log(`violações: ${r.violations} ${JSON.stringify(r.never)}`);
    console.log(`presente: ${r.present_count}/${r.of}; falta: ${r.missing.join(', ') || 'nada'}`);
    console.log(`factos: ${JSON.stringify(r.facts)}`);
    console.log(`animações depois de premir: ${JSON.stringify(r.animations)}`);
    console.log(`premir: ${JSON.stringify(r.press)} | alvos: ${JSON.stringify(r.targets)} | transbordo: ${JSON.stringify(r.overflow)}`);
    process.exit(0);
  }, (e) => { console.error(e.message); process.exit(1); });
}
