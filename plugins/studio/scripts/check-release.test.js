// Tests for scripts/check-release.js. Run: node --test plugins/studio/scripts/check-release.test.js
const { test } = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..', '..');
const SCRIPT = path.join(ROOT, 'scripts', 'check-release.js');
const check = (root) => spawnSync('node', [SCRIPT, root], { encoding: 'utf8', timeout: 10000 });

test('check-release passes on this repository', () => {
  const r = check(ROOT);
  assert.strictEqual(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /release check ok/);
});

function copy() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'release-'));
  for (const f of ['README.md', 'plugins/studio/vendor.json', 'plugins/studio/.claude-plugin/plugin.json']) {
    fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true });
    fs.copyFileSync(path.join(ROOT, f), path.join(dir, f));
  }
  for (const d of fs.readdirSync(path.join(ROOT, 'plugins/studio/skills'))) fs.mkdirSync(path.join(dir, 'plugins/studio/skills', d), { recursive: true });
  const sh = path.join(dir, 'plugins/studio/skills/impeccable/scripts/impeccable');
  fs.mkdirSync(path.dirname(sh), { recursive: true });
  fs.writeFileSync(sh, '#!/bin/sh\n', { mode: 0o755 });
  for (const f of ['VERSION', 'SHA256SUMS']) fs.copyFileSync(path.join(ROOT, 'plugins/studio/skills/impeccable/scripts', f), path.join(path.dirname(sh), f));
  return dir;
}

test('check-release fails on a README version that differs from vendor.json', () => {
  const dir = copy();
  assert.strictEqual(check(dir).status, 0);
  const readme = path.join(dir, 'README.md');
  fs.writeFileSync(readme, fs.readFileSync(readme, 'utf8').replace('**Impeccable** 4.7.0', '**Impeccable** 9.9.9'));
  const r = check(dir);
  assert.strictEqual(r.status, 1);
  assert.match(r.stdout + r.stderr, /Impeccable.*9\.9\.9.*4\.7\.0/);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('check-release fails on an unknown skill folder and a non-executable launcher', () => {
  const dir = copy();
  fs.mkdirSync(path.join(dir, 'plugins/studio/skills/stray'));
  fs.chmodSync(path.join(dir, 'plugins/studio/skills/impeccable/scripts/impeccable'), 0o644);
  const out = check(dir);
  assert.strictEqual(out.status, 1);
  assert.match(out.stdout, /stray/);
  assert.match(out.stdout, /launcher/);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('check-release: a missing README is one problem line, not a stack trace', () => {
  const dir = copy();
  fs.rmSync(path.join(dir, 'README.md'));
  const r = check(dir);
  assert.strictEqual(r.status, 1);
  assert.match(r.stdout, /README/);
  assert.doesNotMatch(r.stderr, /at .*\(/);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('check-release: a vendored skill with no README row is reported', () => {
  const dir = copy();
  const readme = path.join(dir, 'README.md');
  fs.writeFileSync(readme, fs.readFileSync(readme, 'utf8').replace(/^\| \*\*Humanizer\*\* .*$/m, ''));
  const r = check(dir);
  assert.strictEqual(r.status, 1);
  assert.match(r.stdout, /humanizer.*no README .*row/i);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('check-release: a missing or incomplete SHA256SUMS is a problem line', () => {
  const dir = copy();
  const sums = path.join(dir, 'plugins/studio/skills/impeccable/scripts/SHA256SUMS');
  const good = fs.readFileSync(sums, 'utf8');
  fs.writeFileSync(sums, good.replace('# engine-v', '# engine-vX'));
  let r = check(dir);
  assert.strictEqual(r.status, 1);
  assert.match(r.stdout, /SHA256SUMS/);
  fs.writeFileSync(sums, good.split('\n').filter((l) => !/windows/.test(l)).join('\n'));
  r = check(dir);
  assert.strictEqual(r.status, 1);
  assert.match(r.stdout, /SHA256SUMS/);
  fs.rmSync(sums);
  r = check(dir);
  assert.strictEqual(r.status, 1);
  assert.match(r.stdout, /SHA256SUMS/);
  fs.rmSync(dir, { recursive: true, force: true });
});
