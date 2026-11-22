// Tests for compact.js. Run: node --test plugins/studio/hooks/compact.test.js
const { test } = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const HOOK = path.join(__dirname, 'compact.js');

function run(input) {
  const env = { ...process.env };
  delete env.CLAUDE_PROJECT_DIR;
  const r = spawnSync(process.execPath, [HOOK], {
    input: typeof input === 'string' ? input : JSON.stringify(input), encoding: 'utf8', timeout: 10000, env,
  });
  assert.strictEqual(r.status, 0, r.stderr);
  assert.strictEqual(r.stdout, '');
}

function project(runs) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-compact-'));
  let t = Date.now() / 1000 - 1000;
  for (const [slug, phase, sessions] of runs) {
    const folder = path.join(dir, 'docs', 'studio', slug);
    fs.mkdirSync(folder, { recursive: true });
    fs.writeFileSync(path.join(folder, 'state.md'), `---\nslug: ${slug}\nphase: ${phase}\n${sessions === undefined ? '' : `sessions: ${sessions}\n`}---\n`);
    fs.utimesSync(path.join(folder, 'state.md'), t, t);
    t += 10;
  }
  return dir;
}

const log = (dir, slug) => {
  const file = path.join(dir, 'docs', 'studio', slug, 'compactions.jsonl');
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8').trim().split('\n').map((l) => JSON.parse(l)) : [];
};

test('with no session recorded in any run, a compaction goes to the most recent open run, unlinked and without the summary', () => {
  const dir = project([['old', '4-implementation'], ['finished', 'done'], ['room-booking', '2-spec']]);
  fs.mkdirSync(path.join(dir, 'src'));
  run({ hook_event_name: 'PostCompact', cwd: path.join(dir, 'src'), session_id: 's1', trigger: 'auto', compact_summary: 'SECRET project content' });
  const lines = log(dir, 'room-booking');
  assert.strictEqual(lines.length, 1);
  assert.deepStrictEqual({ ...lines[0], date: undefined }, { date: undefined, trigger: 'auto', phase: '2-spec', session: 's1', linked: false });
  assert.ok(!JSON.stringify(lines).includes('SECRET'));
  assert.deepStrictEqual(log(dir, 'old'), []);
  assert.deepStrictEqual(log(dir, 'finished'), []);
  run({ hook_event_name: 'PostCompact', cwd: dir, session_id: 's1', trigger: 'manual', agent_id: 'a1', agent_type: 'studio:implementer' });
  const two = log(dir, 'room-booking');
  assert.strictEqual(two.length, 2);
  assert.strictEqual(two[1].agent, 'a1');
  assert.strictEqual(two[1].agent_type, 'studio:implementer');
  fs.rmSync(dir, { recursive: true, force: true });
});

test('nothing is written without an in-progress run, for other events or on bad input', () => {
  const dir = project([['finished', 'done']]);
  run({ hook_event_name: 'PostCompact', cwd: dir, trigger: 'auto' });
  assert.deepStrictEqual(log(dir, 'finished'), []);
  const empty = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-compact-'));
  run({ hook_event_name: 'PostCompact', cwd: empty, trigger: 'auto' });
  assert.deepStrictEqual(fs.readdirSync(empty), []);
  const active = project([['x', '4-implementation']]);
  run({ hook_event_name: 'PreCompact', cwd: active, trigger: 'auto' });
  assert.deepStrictEqual(log(active, 'x'), []);
  // a repository inside a folder with its own run does not log to the parent's run
  const inner = path.join(active, 'other-repo');
  fs.mkdirSync(path.join(inner, '.git'), { recursive: true });
  run({ hook_event_name: 'PostCompact', cwd: inner, trigger: 'auto' });
  assert.deepStrictEqual(log(active, 'x'), []);
  run('not json');
  run('');
  for (const d of [dir, empty, active]) fs.rmSync(d, { recursive: true, force: true });
});

test('a compaction goes to the run that lists the session, never to a run of other sessions', () => {
  // mtimes grow in this order: the session's own run is the oldest
  const dir = project([['mine', '4-implementation', 's0, s1'], ['theirs', '2-spec', 's9'], ['legacy', '2-spec']]);
  run({ hook_event_name: 'PostCompact', cwd: dir, session_id: 's1', trigger: 'auto' });
  assert.deepStrictEqual({ ...log(dir, 'mine')[0], date: undefined }, { date: undefined, trigger: 'auto', phase: '4-implementation', session: 's1', linked: true });
  assert.deepStrictEqual(log(dir, 'theirs'), []);
  assert.deepStrictEqual(log(dir, 'legacy'), []);
  // a session no run lists: only a run without recorded sessions can take it, marked unlinked
  run({ hook_event_name: 'PostCompact', cwd: dir, session_id: 's2', trigger: 'auto' });
  assert.strictEqual(log(dir, 'legacy').length, 1);
  assert.strictEqual(log(dir, 'legacy')[0].linked, false);
  assert.deepStrictEqual(log(dir, 'theirs'), []);
  assert.strictEqual(log(dir, 'mine').length, 1);
  // the parked run of another session takes nothing, even as the only open run
  const parked = project([['parked', '2-spec', 's9']]);
  run({ hook_event_name: 'PostCompact', cwd: parked, session_id: 's2', trigger: 'auto' });
  run({ hook_event_name: 'PostCompact', cwd: parked, trigger: 'auto' });
  assert.deepStrictEqual(log(parked, 'parked'), []);
  for (const d of [dir, parked]) fs.rmSync(d, { recursive: true, force: true });
});

test('a placeholder is not a session id, and closed runs take nothing', () => {
  for (const placeholder of ['<the id of each session that worked on this run, comma-separated>', '${CLAUDE_SESSION_ID}', '']) {
    const dir = project([['tpl', '0-prepare', placeholder]]);
    run({ hook_event_name: 'PostCompact', cwd: dir, session_id: 's1', trigger: 'auto' });
    assert.strictEqual(log(dir, 'tpl').length, 1, placeholder);
    assert.strictEqual(log(dir, 'tpl')[0].linked, false, placeholder);
    fs.rmSync(dir, { recursive: true, force: true });
  }
  const closed = project([['a', 'superseded', 's1'], ['b', '7-done', 's1'], ['c', 'done']]);
  run({ hook_event_name: 'PostCompact', cwd: closed, session_id: 's1', trigger: 'auto' });
  for (const slug of ['a', 'b', 'c']) assert.deepStrictEqual(log(closed, slug), []);
  fs.rmSync(closed, { recursive: true, force: true });
});
