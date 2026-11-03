const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const repoRoot = path.resolve(__dirname, '..', '..', '..');
const skillDir = path.join(repoRoot, 'plugins', 'studio', 'skills', 'graphify');
const skill = fs.readFileSync(path.join(skillDir, 'SKILL.md'), 'utf8');
const version = fs.readFileSync(path.join(skillDir, '.graphify_version'), 'utf8').trim();
const refDir = path.join(skillDir, 'references');
const files = [path.join(skillDir, 'SKILL.md'), ...fs.readdirSync(refDir).map((f) => path.join(refDir, f))];

test('graphify SKILL.md has no powershell fence', () => {
  assert.doesNotMatch(skill, /```powershell/i);
});

test('every saved-interpreter use is quoted', () => {
  for (const f of files) {
    const text = fs.readFileSync(f, 'utf8');
    for (const m of text.matchAll(/.?\$\(cat graphify-out\/\.graphify_python\)/g)) {
      assert.ok(m[0].startsWith('"'), `${path.basename(f)}: unquoted ${m[0]}`);
    }
  }
});

test('every graphifyy install line is pinned to .graphify_version', () => {
  for (const f of files) {
    const lines = fs.readFileSync(f, 'utf8').split('\n').filter((l) => /(pip|uv tool) install/.test(l) && l.includes('graphifyy'));
    for (const l of lines) {
      assert.ok(l.includes(`graphifyy==${version}`) || l.includes(`]==${version}`), `${path.basename(f)}: ${l.trim()}`);
      assert.doesNotMatch(l, /--upgrade/);
    }
  }
});

test('Step 1 is one bash block and passes bash -n', () => {
  const step = skill.split('### Step 1')[1].split('### Step 2')[0];
  const blocks = [...step.matchAll(/```(\w+)\n([\s\S]*?)```/g)];
  assert.strictEqual(blocks.length, 1);
  assert.strictEqual(blocks[0][1], 'bash');
  assert.match(step, /bash/i);
  const r = spawnSync('bash', ['-n'], { input: blocks[0][2], encoding: 'utf8' });
  assert.strictEqual(r.status, 0, r.stderr);
});

test('vendor.js refuses a mixed-dialect skill and leaves the destination untouched', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vendor-test-'));
  try {
    fs.mkdirSync(path.join(tmp, 'scripts'));
    fs.copyFileSync(path.join(repoRoot, 'scripts', 'vendor.js'), path.join(tmp, 'scripts', 'vendor.js'));
    const dest = path.join(tmp, 'plugins', 'studio', 'skills', 'graphify');
    fs.mkdirSync(dest, { recursive: true });
    fs.writeFileSync(path.join(dest, 'SKILL.md'), 'old\n');
    fs.writeFileSync(path.join(tmp, 'plugins', 'studio', 'vendor.json'), '{}\n');
    const src = path.join(tmp, 'src');
    fs.mkdirSync(src);
    fs.writeFileSync(path.join(src, 'SKILL.md'), '---\ndescription: x\n---\n```powershell\nGet-Date\n```\n```bash\ndate\n```\n');
    fs.writeFileSync(path.join(src, '.graphify_version'), '9.9.9\n');
    const r = spawnSync(process.execPath, [path.join(tmp, 'scripts', 'vendor.js'), 'graphify', src], { encoding: 'utf8', timeout: 20000 });
    assert.notStrictEqual(r.status, 0);
    assert.match(r.stderr, /powershell/i);
    assert.strictEqual(fs.readFileSync(path.join(dest, 'SKILL.md'), 'utf8'), 'old\n');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
