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

test('vendor.js with a missing source leaves the destination untouched', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vendor-test-'));
  try {
    fs.mkdirSync(path.join(tmp, 'scripts'));
    fs.copyFileSync(path.join(repoRoot, 'scripts', 'vendor.js'), path.join(tmp, 'scripts', 'vendor.js'));
    const dest = path.join(tmp, 'plugins', 'studio', 'skills', 'ponytail');
    fs.mkdirSync(dest, { recursive: true });
    fs.writeFileSync(path.join(dest, 'SKILL.md'), 'old\n');
    fs.writeFileSync(path.join(tmp, 'plugins', 'studio', 'vendor.json'), '{}\n');
    const r = spawnSync(process.execPath, [path.join(tmp, 'scripts', 'vendor.js'), 'ponytail', path.join(tmp, 'nope')], { encoding: 'utf8', timeout: 20000 });
    assert.notStrictEqual(r.status, 0);
    assert.strictEqual(fs.readFileSync(path.join(dest, 'SKILL.md'), 'utf8'), 'old\n');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('Step 1 resolves the uv tool interpreter (fake uv, no python3 on PATH)', { skip: process.platform === 'win32' }, () => {
  const step = skill.split('### Step 1')[1].split('### Step 2')[0];
  const block = step.match(/```bash\n([\s\S]*?)```/)[1].replace('INPUT_PATH', '.');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'step1-test-'));
  try {
    const bin = path.join(tmp, 'bin');
    const tools = path.join(tmp, 'tools');
    const work = path.join(tmp, 'work');
    for (const d of [bin, tools, work]) fs.mkdirSync(d);
    // Only the utilities Step 1 needs; deliberately no python3.
    for (const c of ['bash', 'which', 'head', 'tr', 'tail', 'mkdir', 'cat', 'pwd', 'dirname', 'chmod']) {
      const r = spawnSync('bash', ['-c', `command -v ${c}`], { encoding: 'utf8' }).stdout.trim();
      if (r) fs.symlinkSync(r, path.join(bin, c));
    }
    const calls = path.join(tmp, 'uv-calls.txt');
    fs.writeFileSync(path.join(bin, 'uv'), `#!/bin/bash
echo "$@" >> "${calls}"
if [ "$1 $2" = "tool dir" ]; then echo "${tools}"; exit 0; fi
if [ "$1 $2" = "tool install" ]; then
  mkdir -p "${tools}/graphifyy/bin"
  printf '#!/bin/bash\\ncase "$1" in -V) echo Python 3.12.0; exit 0;; esac\\ncase "$*" in *"open("*) printf "%%s" "$0" > graphify-out/.graphify_python;; esac\\nexit 0\\n' > "${tools}/graphifyy/bin/python"
  chmod +x "${tools}/graphifyy/bin/python"
fi
exit 0
`, { mode: 0o755 });
    const r = spawnSync(path.join(bin, 'bash'), ['-c', block], { cwd: work, env: { PATH: bin, HOME: tmp }, encoding: 'utf8', timeout: 20000 });
    assert.strictEqual(r.status, 0, r.stderr);
    assert.match(fs.readFileSync(calls, 'utf8'), new RegExp(`tool install graphifyy==${version.replace(/\./g, '\\.')}`));
    assert.strictEqual(fs.readFileSync(path.join(work, 'graphify-out', '.graphify_python'), 'utf8'), path.join(tools, 'graphifyy', 'bin', 'python'));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

for (const [ver, ok] of [['3.10.14', false], ['3.11.2', true]]) {
  test(`Step 1 with a python3 reporting ${ver}: ${ok ? 'proceeds' : 'exits 1 and never runs -c'}`, { skip: process.platform === 'win32' }, () => {
    const block = skill.split('### Step 1')[1].split('### Step 2')[0].match(/```bash\n([\s\S]*?)```/)[1].replace('INPUT_PATH', '.');
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'step1-ver-'));
    try {
      const bin = path.join(tmp, 'bin');
      const work = path.join(tmp, 'work');
      for (const d of [bin, work]) fs.mkdirSync(d);
      for (const c of ['bash', 'which', 'head', 'tr', 'tail', 'mkdir', 'cat', 'pwd', 'dirname']) {
        const r = spawnSync('bash', ['-c', `command -v ${c}`], { encoding: 'utf8' }).stdout.trim();
        if (r) fs.symlinkSync(r, path.join(bin, c));
      }
      const marker = path.join(tmp, 'marker');
      fs.writeFileSync(path.join(bin, 'python3'), `#!/bin/bash\ncase "$1" in -V) echo Python ${ver}; exit 0;; esac\n: > "${marker}"\ncase "$*" in *"print(sys.executable)"*) echo "$0";; esac\ncase "$*" in *"open("*) printf "%s" "$0" > graphify-out/.graphify_python;; esac\nexit 0\n`, { mode: 0o755 });
      const r = spawnSync(path.join(bin, 'bash'), ['-c', block], { cwd: work, env: { PATH: bin, HOME: tmp }, encoding: 'utf8', timeout: 20000 });
      if (ok) {
        assert.strictEqual(r.status, 0, r.stderr);
        assert.ok(fs.existsSync(marker));
      } else {
        assert.strictEqual(r.status, 1);
        assert.match(r.stderr, /graphify in studio needs Python 3\.11\+ \(3\.10 is end of life and cannot keep the project folder off sys\.path\)/);
        assert.ok(!fs.existsSync(marker));
      }
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
}
