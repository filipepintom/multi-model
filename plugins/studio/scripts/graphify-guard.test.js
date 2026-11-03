// Tests for the interpreter guard in the graphify skill. Run: node --test plugins/studio/scripts/graphify-guard.test.js
const { test } = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const skill = fs.readFileSync(path.join(__dirname, '..', 'skills', 'graphify', 'SKILL.md'), 'utf8');
const guard = skill.split('## Interpreter guard for subcommands')[1].match(/```bash\n([\s\S]*?)```/)[1];

function run(content, { fakeValid, inProject } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gguard-'));
  const dir = path.join(root, 'proj'); // the project; the trusted fake python lives outside it
  const bin = path.join(root, 'bin');
  fs.mkdirSync(dir);
  fs.mkdirSync(bin);
  fs.mkdirSync(path.join(dir, 'graphify-out'));
  // fake python: "import graphify" succeeds; any other -c writes the script's own path to the marker file
  const py = path.join(bin, 'python3');
  fs.writeFileSync(py, '#!/bin/sh\ncase "$2" in *"import graphify"*) exit 0;; esac\nprintf %s "$0" > graphify-out/.graphify_python\n', { mode: 0o755 });
  fs.writeFileSync(path.join(dir, 'evil.sh'), 'touch pwned\n');
  const file = path.join(dir, 'graphify-out', '.graphify_python');
  if (inProject) { // a python shipped inside the cloned project: validating it would execute it
    fs.mkdirSync(path.join(dir, 'tools'));
    fs.writeFileSync(path.join(dir, 'tools', 'python'), '#!/bin/sh\ntouch pwned\n', { mode: 0o755 });
    content = path.join(dir, 'tools', 'python');
  }
  fs.writeFileSync(file, fakeValid ? py : content);
  spawnSync('bash', ['-c', guard], { cwd: dir, env: { PATH: `${bin}:/usr/bin:/bin` } });
  return { dir, py, file, after: fs.readFileSync(file, 'utf8') };
}

test('guard: an untrusted .graphify_python is rewritten and never executed', () => {
  const r = run('sh evil.sh');
  assert.ok(!fs.existsSync(path.join(r.dir, 'pwned')));
  assert.strictEqual(r.after, r.py);
});

test('guard: a valid interpreter path is kept', () => {
  const r = run('', { fakeValid: true });
  assert.strictEqual(r.after, r.py);
});

test('guard: a path whose name is not python is rewritten', () => {
  const r = run('/bin/sh');
  assert.strictEqual(r.after, r.py);
});

test('guard: an interpreter inside the project is never executed and is replaced', () => {
  const r = run('', { inProject: true });
  assert.ok(!fs.existsSync(path.join(r.dir, 'pwned')));
  assert.strictEqual(r.after, r.py);
});

const sh = (dir, extra = {}) => ({ cwd: dir, env: { PATH: '/usr/bin:/bin', ...extra } });
function project() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gguard-'));
  const dir = path.join(root, 'proj');
  fs.mkdirSync(path.join(dir, 'graphify-out'), { recursive: true });
  return { root, dir, file: path.join(dir, 'graphify-out', '.graphify_python') };
}

test('guard: a project-local venv symlinked to an outside python is rejected unexecuted', () => {
  const { root, dir, file } = project();
  const marker = path.join(root, 'marker');
  const real = path.join(root, 'real-python3');
  fs.writeFileSync(real, `#!/bin/sh\ntouch "${marker}"\n`, { mode: 0o755 });
  fs.mkdirSync(path.join(dir, '.venv', 'bin'), { recursive: true });
  fs.writeFileSync(path.join(dir, '.venv', 'pyvenv.cfg'), 'home = /usr/bin\n');
  const link = path.join(dir, '.venv', 'bin', 'python3');
  fs.symlinkSync(real, link);
  fs.writeFileSync(file, link);
  spawnSync('bash', ['-c', guard], sh(dir));
  assert.ok(!fs.existsSync(marker));
  assert.notStrictEqual(fs.readFileSync(file, 'utf8'), link);
});

test('guard: import graphify is validated outside the project (a repo graphify.py does not run)', (t) => {
  const { root, dir, file } = project();
  const marker = path.join(root, 'marker');
  fs.writeFileSync(path.join(dir, 'graphify.py'), `open(${JSON.stringify(marker)}, 'w').close()\n`);
  const py = spawnSync('python3', ['-c', 'import sys;print(sys.executable)'], { encoding: 'utf8' }).stdout.trim();
  if (!py) return t.skip('python3 not on PATH');
  fs.writeFileSync(file, py);
  spawnSync('bash', ['-c', guard], sh(dir));
  assert.ok(!fs.existsSync(marker));
});

test('guard: Windows absolute paths and free-threaded names are classified as valid', () => {
  const { dir, file } = project();
  const lines = guard.split('\n');
  const cut = lines.findIndex((l) => l.includes('-f "$P"'));
  assert.ok(cut > 0, 'existence check line not found');
  const classify = (content) => {
    fs.writeFileSync(file, content);
    return spawnSync('bash', ['-c', `${lines.slice(0, cut).join('\n')}\nprintf %s "$P"`], { ...sh(dir), encoding: 'utf8' }).stdout;
  };
  assert.strictEqual(classify('C:\\Python312\\python.exe'), 'C:\\Python312\\python.exe');
  assert.strictEqual(classify('/usr/bin/python3.13t'), '/usr/bin/python3.13t');
  assert.strictEqual(classify('C:\\x\\evil.exe'), '');
  assert.strictEqual(classify('relative/python3'), '');
});

test('skill and references: every python -c / -m use sets PYTHONSAFEPATH=1', () => {
  const dir = path.join(__dirname, '..', 'skills', 'graphify');
  const files = [path.join(dir, 'SKILL.md'), ...fs.readdirSync(path.join(dir, 'references')).map((f) => path.join(dir, 'references', f))];
  let n = 0;
  for (const f of files) {
    for (const l of fs.readFileSync(f, 'utf8').split('\n')) {
      if (/\.graphify_python\)" -[cm]\b/.test(l)) { n++; assert.match(l, /PYTHONSAFEPATH=1 "\$\(cat/, `${path.basename(f)}: ${l}`); }
    }
  }
  assert.ok(n > 20);
});

test('Step 1 and the guard export PYTHONSAFEPATH=1 before the first interpreter call', () => {
  const step1 = skill.split('### Step 1 - Ensure graphify is installed')[1].match(/```bash\n([\s\S]*?)```/)[1];
  for (const block of [step1, guard]) {
    const lines = block.split('\n').filter((l) => l.trim() && !l.trim().startsWith('#'));
    assert.match(lines[0], /^export PYTHONSAFEPATH=1(\s|$)/);
  }
});
