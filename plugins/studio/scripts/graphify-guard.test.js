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
