// Tests for the pinned hashes in the Impeccable launcher. Run: node --test plugins/studio/scripts/impeccable-pin.test.js
// No network: a fake curl on PATH serves a fake binary and a sidecar that matches it.
const { test } = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const SCRIPTS = path.resolve(__dirname, '..', 'skills', 'impeccable', 'scripts');
const win = process.platform === 'win32';
const FAKE = '#!/bin/sh\necho fake-engine\n';
const fakeHash = crypto.createHash('sha256').update(FAKE).digest('hex');
const asset = `impeccable-${process.platform === 'darwin' ? 'darwin' : 'linux'}-${/arm64|aarch64/.test(process.arch) ? 'arm64' : 'x64'}`;

function setup(sums) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pin-'));
  const scripts = path.join(dir, 'scripts');
  fs.mkdirSync(scripts);
  fs.copyFileSync(path.join(SCRIPTS, 'impeccable'), path.join(scripts, 'impeccable'));
  fs.chmodSync(path.join(scripts, 'impeccable'), 0o755);
  fs.writeFileSync(path.join(scripts, 'VERSION'), '9.9.9\n');
  if (sums !== null) fs.writeFileSync(path.join(scripts, 'SHA256SUMS'), sums);
  fs.mkdirSync(path.join(dir, 'fakebin'));
  fs.writeFileSync(path.join(dir, 'payload'), FAKE);
  fs.writeFileSync(path.join(dir, 'payload.sha256'), `${fakeHash}  ${asset}\n`);
  // fake curl: last arg is the URL, the one before -o is the target file
  fs.writeFileSync(path.join(dir, 'fakebin', 'curl'), `#!/bin/sh
for a; do case "$prev" in -o) out=$a ;; esac; prev=$a; url=$a; done
case "$url" in *.sha256) cp "${dir}/payload.sha256" "$out" ;; *) cp "${dir}/payload" "$out" ;; esac
`, { mode: 0o755 });
  return dir;
}
function run(dir) {
  const home = path.join(dir, 'home');
  const r = spawnSync(path.join(dir, 'scripts', 'impeccable'), ['version'], {
    encoding: 'utf8', timeout: 20000,
    env: { PATH: `${path.join(dir, 'fakebin')}:/usr/bin:/bin`, HOME: home, IMPECCABLE_HOME: home },
  });
  return { r, cached: path.join(home, 'bin', '9.9.9', 'impeccable') };
}

test('pinned SHA256SUMS entry that does not match refuses the install even if the sidecar matches', { skip: win }, () => {
  const dir = setup(`# engine-v9.9.9\n${'0'.repeat(64)}  ${asset}\n`);
  const { r, cached } = run(dir);
  assert.notStrictEqual(r.status, 0);
  assert.match(r.stderr, /checksum mismatch/);
  assert.ok(!fs.existsSync(cached));
  fs.rmSync(dir, { recursive: true, force: true });
});

test('pinned SHA256SUMS entry that matches installs the binary', { skip: win }, () => {
  const dir = setup(`# engine-v9.9.9\n${fakeHash}  ${asset}\n`);
  const { r, cached } = run(dir);
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(r.stdout, /fake-engine/);
  assert.ok(fs.existsSync(cached));
  fs.rmSync(dir, { recursive: true, force: true });
});

test('without SHA256SUMS the sidecar is still used', { skip: win }, () => {
  const dir = setup(null);
  const { r, cached } = run(dir);
  assert.strictEqual(r.status, 0, r.stderr);
  assert.ok(fs.existsSync(cached));
  fs.rmSync(dir, { recursive: true, force: true });
});

test('SHA256SUMS without an entry for the asset falls back to the sidecar', { skip: win }, () => {
  const dir = setup(`# engine-v9.9.9\n${'0'.repeat(64)}  impeccable-other\n`);
  const { r } = run(dir);
  assert.strictEqual(r.status, 0, r.stderr);
  fs.rmSync(dir, { recursive: true, force: true });
});
