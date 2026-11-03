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
    const home = path.join(tmp, 'home');
    fs.mkdirSync(home);
    const stub = path.join(tmp, 'stub.js');
    fs.writeFileSync(stub, "globalThis.fetch = () => Promise.reject(new Error('offline'));\n");
    // The launcher runs through sh (exec bit irrelevant), so make sh unfindable to get a launcher that cannot start.
    const env = { ...process.env, HOME: home, USERPROFILE: home, PATH: path.join(tmp, 'empty') };
    delete env.CLAUDE_CONFIG_DIR;
    const r = spawnSync(process.execPath, ['--require', stub, path.join(copy, 'scripts', 'doctor.js'), '--json'], { env, encoding: 'utf8', timeout: 200000 });
    const row = JSON.parse(r.stdout).checks.find((c) => c.name === 'Impeccable detector');
    assert.equal(row.status, 'warn');
    assert.match(row.detail, /ENOENT/);
    assert.doesNotMatch(row.fix, /network|online/i);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

// ---- audit-distribution-doctor: fake HOME / CLAUDE_CONFIG_DIR, fetch stub, controlled PATH. Nothing reads the real ~/.claude.
const { knowledgeDir } = require('../hooks/paths.js');

function stubTool(bin, name, body) {
  fs.writeFileSync(path.join(bin, name), `#!/bin/sh\n${body}\n`, { mode: 0o755 });
}

function sandbox({ pip = true, pipx = false, uv = false, py = '3.12.0' } = {}) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'doctor-fake-'));
  const home = path.join(tmp, 'home');
  const cfg = path.join(tmp, 'cfg');
  const bin = path.join(tmp, 'bin');
  for (const d of [home, cfg, bin]) fs.mkdirSync(d);
  const stub = path.join(tmp, 'stub.js');
  fs.writeFileSync(stub, "globalThis.fetch = () => Promise.reject(new Error('offline'));\n");
  stubTool(bin, 'python', `case "$1" in -m) ${pip ? 'echo pip 24.0; exit 0' : 'exit 1'};; esac\necho Python ${py}`);
  if (pipx) stubTool(bin, 'pipx', 'echo 1.7.0');
  if (uv) stubTool(bin, 'uv', 'echo uv 0.5.0');
  const doctor = () => {
    const env = { HOME: home, USERPROFILE: home, CLAUDE_CONFIG_DIR: cfg, PATH: bin, CLAUDE_PLUGIN_DATA: '' };
    const r = spawnSync(process.execPath, ['--require', stub, path.join(__dirname, 'doctor.js'), '--json'], { env, encoding: 'utf8', timeout: 60000 });
    return JSON.parse(r.stdout).checks;
  };
  return { tmp, home, cfg, doctor, done: () => fs.rmSync(tmp, { recursive: true, force: true }) };
}

const row = (checks, re) => checks.find((c) => re.test(c.name));
const json = (file, obj) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(obj)); };

test('fresh install: doctor prints the expected folder and still checks the allow rule', { skip: win }, () => {
  const s = sandbox();
  try {
    const checks = s.doctor();
    const r = row(checks, /lessons folder/);
    assert.equal(r.status, 'warn');
    assert.ok(r.detail.includes(path.join(s.cfg, 'studio', 'knowledge').replace(/\\/g, '/')), r.detail);
    assert.match(r.fix, /first/);
    assert.ok(row(checks, /write lessons without asking/));
  } finally { s.done(); }
});

test('the folder follows studio@<marketplace>, never another plugin\'s studio-* folder', { skip: win }, () => {
  const s = sandbox();
  try {
    const data = path.join(s.cfg, 'plugins', 'data');
    fs.mkdirSync(path.join(data, 'studio-kit-acme'), { recursive: true });
    fs.mkdirSync(path.join(data, 'studio-studio-local', 'knowledge'), { recursive: true });
    json(path.join(s.cfg, 'plugins', 'installed_plugins.json'), { plugins: { 'studio@studio-local': [{}] } });
    const want = path.join(data, 'studio-studio-local', 'knowledge');
    assert.equal(knowledgeDir({ CLAUDE_CONFIG_DIR: s.cfg }, s.home), want);
    const r = row(s.doctor(), /lessons folder/);
    assert.equal(r.status, 'ok');
    assert.equal(r.detail, want.replace(/\\/g, '/'));
  } finally { s.done(); }
});

test('knowledgeDir precedence: STUDIO_KNOWLEDGE_DIR, CLAUDE_PLUGIN_DATA, default', () => {
  assert.equal(knowledgeDir({ STUDIO_KNOWLEDGE_DIR: '/a', CLAUDE_PLUGIN_DATA: '/b' }, '/h'), '/a');
  assert.equal(knowledgeDir({ CLAUDE_PLUGIN_DATA: '/b' }, '/h'), path.join('/b', 'knowledge'));
  assert.equal(knowledgeDir({}, '/h'), path.join('/h', '.claude', 'studio', 'knowledge'));
});

test('duplicates: vendor.json skills (context7-mcp), all vendor plugins, and a user context7 MCP', { skip: win }, () => {
  const s = sandbox();
  try {
    fs.mkdirSync(path.join(s.cfg, 'skills', 'context7-mcp'), { recursive: true });
    json(path.join(s.cfg, 'settings.json'), { enabledPlugins: { 'graphify@somewhere': true } });
    json(path.join(s.cfg, '.claude.json'), { mcpServers: { context7: {} } });
    const r = row(s.doctor(), /twice/);
    assert.equal(r.status, 'warn');
    assert.match(r.detail, /skills\/context7-mcp/);
    assert.match(r.detail, /plugin graphify@somewhere/);
    assert.match(r.detail, /MCP server context7/);
  } finally { s.done(); }
});

test('REA: registered under CLAUDE_CONFIG_DIR, only per project, or missing with the reverse commands', { skip: win }, () => {
  const s = sandbox();
  try {
    let r = row(s.doctor(), /REA/);
    assert.equal(r.status, 'warn');
    assert.match(r.fix, /rea-agents@6\.8\.0 doctor --client claude_code --json/);
    assert.match(r.fix, /setup --client claude_code --dry-run --json/);
    assert.match(r.fix, /restart Claude Code/i);
    json(path.join(s.cfg, '.claude.json'), { projects: { '/x': { mcpServers: { rea: {} } } } });
    r = row(s.doctor(), /REA/);
    assert.equal(r.status, 'ok');
    assert.match(r.detail, /some projects/);
    json(path.join(s.cfg, '.claude.json'), { mcpServers: { rea: {} } });
    r = row(s.doctor(), /REA/);
    assert.equal(r.status, 'ok');
    assert.doesNotMatch(r.detail, /projects/);
  } finally { s.done(); }
});

test('graphify installer: pipx alone warns and asks for uv; python -m pip is ok', { skip: win }, () => {
  let s = sandbox({ pip: false, pipx: true });
  try {
    const r = row(s.doctor(), /^uv/);
    assert.equal(r.status, 'warn');
    assert.match(r.fix, /install uv/i);
    assert.doesNotMatch(row(s.doctor(), /^Python/).fix, /pipx/);
  } finally { s.done(); }
  s = sandbox({ pip: true });
  try { assert.equal(row(s.doctor(), /^uv/).status, 'ok'); } finally { s.done(); }
});

test('doctor: Python 3.10 warns, 3.11 is ok', { skip: win }, () => {
  for (const [py, status] of [['3.10.14', 'warn'], ['3.11.0', 'ok']]) {
    const s = sandbox({ py });
    try {
      const r = row(s.doctor(), /^Python/);
      assert.equal(r.name, 'Python 3.11+ (graphify)');
      assert.equal(r.status, status);
    } finally { s.done(); }
  }
});
