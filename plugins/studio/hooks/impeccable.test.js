// Tests for hooks.json and impeccable.js. Run: node --test plugins/studio/hooks/impeccable.test.js
const { test } = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const win = process.platform === 'win32';
const hooks = JSON.parse(fs.readFileSync(path.join(__dirname, 'hooks.json'), 'utf8')).hooks;
const entries = Object.values(hooks).flat().flatMap((g) => g.hooks.map((h) => ({ ...h, matcher: g.matcher })));

test('hooks.json: Impeccable hooks go through the node wrapper, no shell syntax', () => {
  const imp = entries.filter((h) => /impeccable/.test(h.command));
  assert.equal(imp.length, 3);
  for (const h of imp) assert.doesNotMatch(h.command, /IMPECCABLE_NO_TELEMETRY=|\|\|/);
});

test('hooks.json: every hook command starts with node', () => {
  for (const h of entries) assert.match(h.command, /^node /);
});

test('hooks.json: guard entries fail open', () => {
  const guards = entries.filter((h) => /guard\.js/.test(h.command));
  assert.equal(guards.length, 2);
  for (const h of guards) assert.equal(h.onFailure, 'continue');
});

function plugin(launcherBody) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'imp-hook-'));
  const copy = path.join(tmp, 'plugin with space');
  fs.mkdirSync(path.join(copy, 'hooks'), { recursive: true });
  fs.copyFileSync(path.join(__dirname, 'impeccable.js'), path.join(copy, 'hooks', 'impeccable.js'));
  const dir = path.join(copy, 'skills', 'impeccable', 'scripts');
  fs.mkdirSync(dir, { recursive: true });
  if (launcherBody != null) fs.writeFileSync(path.join(dir, 'impeccable'), launcherBody);
  return { tmp, copy };
}
const runHook = (copy, args, env = {}) =>
  spawnSync(process.execPath, [path.join(copy, 'hooks', 'impeccable.js'), ...args], { encoding: 'utf8', timeout: 20000, input: 'stdin-data', env: { ...process.env, CLAUDE_PLUGIN_ROOT: copy, ...env } });

test('wrapper exits 0 when the launcher is missing', () => {
  const { tmp, copy } = plugin(null);
  try { assert.equal(runHook(copy, ['hook']).status, 0); } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

test('wrapper exits 0 when the launcher exits 1', { skip: win }, () => {
  const { tmp, copy } = plugin('#!/bin/sh\nexit 1\n');
  try { assert.equal(runHook(copy, ['hook']).status, 0); } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

test('wrapper passes argv, stdin and telemetry-off to the launcher', { skip: win }, () => {
  const { tmp, copy } = plugin('#!/bin/sh\n{ echo "args=$*"; echo "tel=$IMPECCABLE_NO_TELEMETRY"; cat; } > "$OUT"\necho from-launcher\n');
  const out = path.join(tmp, 'out.txt');
  try {
    const r = runHook(copy, ['hook', '--x'], { OUT: out });
    assert.equal(r.status, 0);
    assert.match(r.stdout, /from-launcher/);
    const seen = fs.readFileSync(out, 'utf8');
    assert.match(seen, /args=hook --x/);
    assert.match(seen, /tel=1/);
    assert.match(seen, /stdin-data/);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});
