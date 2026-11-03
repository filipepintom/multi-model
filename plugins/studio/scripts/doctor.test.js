const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');

const pluginRoot = path.resolve(__dirname, '..');
const launcherRel = 'skills/impeccable/scripts/impeccable';
const win = process.platform === 'win32';

test('launcher is tracked as executable (100755)', () => {
  const out = execFileSync('git', ['ls-files', '-s', path.join(pluginRoot, launcherRel)], { cwd: __dirname, encoding: 'utf8' });
  assert.match(out, /^100755 /);
});

test('doctor reports a launcher that cannot start without blaming the network', { skip: win }, () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'doctor-test-'));
  try {
    const copy = path.join(tmp, 'studio');
    fs.cpSync(pluginRoot, copy, { recursive: true });
    fs.chmodSync(path.join(copy, launcherRel), 0o644);
    const home = path.join(tmp, 'home');
    fs.mkdirSync(home);
    const stub = path.join(tmp, 'stub.js');
    fs.writeFileSync(stub, "globalThis.fetch = () => Promise.reject(new Error('offline'));\n");
    const env = { ...process.env, HOME: home, USERPROFILE: home };
    delete env.CLAUDE_CONFIG_DIR;
    const r = spawnSync(process.execPath, ['--require', stub, path.join(copy, 'scripts', 'doctor.js'), '--json'], { env, encoding: 'utf8', timeout: 200000 });
    const row = JSON.parse(r.stdout).checks.find((c) => c.name === 'Impeccable detector');
    assert.equal(row.status, 'warn');
    assert.match(row.detail, /EACCES/);
    assert.doesNotMatch(row.fix, /network|online/i);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
