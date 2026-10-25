#!/usr/bin/env node
// Studio doctor: checks that this machine has what the studio plugin needs, and prints a report.
// Read-only: it never installs, removes or edits anything (the /studio:setup skill does fixes, with the user's OK).
//
//   node doctor.js          markdown report
//   node doctor.js --json   machine-readable report
//
// Exit code 0 when no required check fails, 1 otherwise.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const PLUGIN_ROOT = path.resolve(__dirname, '..');
const HOME = os.homedir();
const CLAUDE_DIR = process.env.CLAUDE_CONFIG_DIR || path.join(HOME, '.claude');
const isWin = process.platform === 'win32';
const checks = [];

function add(area, name, status, detail, fix = '') {
  checks.push({ area, name, status, detail, fix });
}

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { encoding: 'utf8', timeout: opts.timeout || 15000, shell: isWin, env: { ...process.env, ...opts.env } });
  return { ok: r.status === 0, out: `${r.stdout || ''}${r.stderr || ''}`.trim(), status: r.status };
}

function version(text) {
  const m = /(\d+)\.(\d+)(?:\.(\d+))?/.exec(text || '');
  return m ? [Number(m[1]), Number(m[2]), Number(m[3] || 0)] : null;
}

const atLeast = (v, min) => !!v && (v[0] - min[0] || v[1] - min[1] || v[2] - min[2]) >= 0;

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
}

// ---- Required
{
  const v = version(process.version);
  add('required', 'Node.js', atLeast(v, [18, 0, 0]) ? 'ok' : 'fail', process.version,
    'Install Node.js 18 or later (LTS recommended): https://nodejs.org');
}
{
  const r = run('git', ['--version']);
  add('required', 'git', r.ok ? 'ok' : 'fail', r.ok ? r.out : 'not found', 'Install git: https://git-scm.com');
}
{
  const r = run('claude', ['--version']);
  add('required', 'Claude Code', r.ok ? 'ok' : 'warn', r.ok ? r.out.split('\n')[0] : 'claude CLI not on PATH',
    'Make sure the Claude Code CLI is installed and on PATH.');
}

// ---- Optional tools
{
  const py = [['python', ['--version']], ['python3', ['--version']], ['py', ['-3', '--version']]]
    .map(([c, a]) => ({ c, r: run(c, a) })).find((x) => x.r.ok && /Python 3/.test(x.r.out));
  const v = py && version(py.r.out);
  add('optional', 'Python 3.10+ (graphify)', atLeast(v, [3, 10, 0]) ? 'ok' : 'warn', py ? py.r.out : 'not found',
    'Only needed for /studio:graphify. Install Python 3.10+ and uv (https://docs.astral.sh/uv/) or pipx.');
  const installer = ['uv', 'pipx', 'pip'].find((t) => run(t, ['--version']).ok);
  add('optional', 'uv / pipx / pip (graphify)', installer ? 'ok' : 'warn', installer || 'none found',
    'graphify installs its Python package (graphifyy) on first use with uv, pipx or pip.');
}
{
  const launcher = path.join(PLUGIN_ROOT, 'skills', 'impeccable', 'scripts', isWin ? 'impeccable.cmd' : 'impeccable');
  if (!fs.existsSync(launcher)) {
    add('optional', 'Impeccable detector', 'warn', 'launcher missing from the plugin', 'Reinstall the studio plugin.');
  } else {
    // First run downloads the platform binary into a version-pinned cache.
    const r = run(launcher, ['--version'], { timeout: 180000, env: { IMPECCABLE_NO_TELEMETRY: '1' } });
    add('optional', 'Impeccable detector', r.ok ? 'ok' : 'warn', r.ok ? `v${r.out.split('\n').pop()}` : r.out.slice(-200),
      'Needs network on first run to download the detector binary. Rerun /studio:setup once online.');
  }
}

// ---- Network
async function network() {
  try {
    const res = await fetch('https://mcp.context7.com/mcp', { method: 'GET', signal: AbortSignal.timeout(10000) });
    add('network', 'Context7 server reachable', 'ok', `HTTP ${res.status} from mcp.context7.com`);
  } catch (e) {
    add('network', 'Context7 server reachable', 'warn', `no response (${e.cause?.code || e.name})`,
      'Agents fall back to their own knowledge for library docs. Check proxy/firewall rules for mcp.context7.com.');
  }
}

// ---- Duplicates of the bundled skills
function duplicates() {
  const settings = readJson(path.join(CLAUDE_DIR, 'settings.json')) || {};
  const dup = [];
  for (const skill of ['impeccable', 'graphify', 'humanizer', 'ponytail']) {
    if (fs.existsSync(path.join(CLAUDE_DIR, 'skills', skill))) dup.push(`global skill ~/.claude/skills/${skill}`);
  }
  for (const [id, on] of Object.entries(settings.enabledPlugins || {})) {
    if (on && /^(ponytail|impeccable|humanizer)@/.test(id)) dup.push(`plugin ${id}`);
  }
  if (JSON.stringify(settings.hooks || {}).includes('impeccable')) dup.push('Impeccable hooks in ~/.claude/settings.json');
  add('duplicates', 'Bundled skills installed twice', dup.length ? 'warn' : 'ok', dup.length ? dup.join('; ') : 'none',
    'These run in addition to the copies bundled in studio (e.g. the detector runs twice per edit). Remove them: /studio:setup can do it with your OK.');
}

// ---- Personal knowledge folder and write permission
function knowledge() {
  const dataRoot = path.join(CLAUDE_DIR, 'plugins', 'data');
  const dirs = fs.existsSync(dataRoot) ? fs.readdirSync(dataRoot).filter((d) => /^studio-/.test(d) && d !== 'studio-inline') : [];
  const dir = process.env.STUDIO_KNOWLEDGE_DIR || (dirs[0] ? path.join(dataRoot, dirs[0], 'knowledge') : null);
  if (!dir) {
    add('knowledge', 'Personal lessons folder', 'warn', 'not created yet',
      'It is created automatically the first time you run /studio:build, /studio:audit or /studio:retro.');
    return;
  }
  const exists = fs.existsSync(dir);
  add('knowledge', 'Personal lessons folder', exists ? 'ok' : 'warn', dir.replace(/\\/g, '/'),
    exists ? '' : 'Created automatically on the first /studio:build, /studio:audit or /studio:retro.');
  const settings = readJson(path.join(CLAUDE_DIR, 'settings.json')) || {};
  const allow = (settings.permissions && settings.permissions.allow) || [];
  const norm = dir.replace(/\\/g, '/').toLowerCase().replace(/^([a-z]):/, '/$1');
  const granted = allow.some((rule) => /^(Edit|Write)\(/.test(rule) && rule.replace(/\\/g, '/').toLowerCase().includes(norm.split('/').slice(-4).join('/')));
  add('knowledge', 'Retro can write lessons without asking', granted ? 'ok' : 'warn', granted ? 'allow rule found' : 'no allow rule',
    'Without it, each retro asks once before saving lessons. /studio:setup can add the rule with your OK.');
}

// ---- Optional companion plugin
function companions() {
  const installed = readJson(path.join(CLAUDE_DIR, 'plugins', 'installed_plugins.json'));
  const has = installed && Object.keys(installed.plugins || {}).some((k) => k.startsWith('claude-security@'));
  add('optional', 'Claude Security plugin (deep security audits)', has ? 'ok' : 'warn', has ? 'installed' : 'not installed',
    '/studio:audit recommends it for deep security scans: claude plugin install claude-security@claude-plugins-official');
}

function markdown() {
  const icon = { ok: '✅', warn: '⚠️', fail: '❌' };
  const lines = ['| | Area | Check | Detail |', '|---|---|---|---|'];
  for (const c of checks) lines.push(`| ${icon[c.status]} | ${c.area} | ${c.name} | ${String(c.detail).replace(/\|/g, '/')} |`);
  const todo = checks.filter((c) => c.status !== 'ok' && c.fix);
  if (todo.length) {
    lines.push('', '**To fix:**');
    for (const c of todo) lines.push(`- **${c.name}:** ${c.fix}`);
  }
  return lines.join('\n');
}

(async () => {
  await network();
  duplicates();
  knowledge();
  companions();
  const failed = checks.some((c) => c.status === 'fail');
  if (process.argv.includes('--json')) console.log(JSON.stringify({ ok: !failed, checks }, null, 2));
  else console.log(markdown());
  process.exit(failed ? 1 : 0);
})();
