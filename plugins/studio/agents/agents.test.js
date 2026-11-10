// Tests for the REA tool lists of the reverser agents. Run: node --test plugins/studio/agents/agents.test.js
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const tools = (name) => {
  const m = fs.readFileSync(path.join(__dirname, `${name}.md`), 'utf8').match(/^tools:\s*(.+)$/m);
  return m[1].split(',').map((t) => t.trim());
};

test('reverser-live: no raw consoles, no uninstall or push', () => {
  const t = tools('reverser-live');
  for (const n of ['gdb_console', 'execute_rizin_command', 'rizin_debug_command', 'cutter_command', 'uninstall_adb_package', 'push_adb_file']) {
    assert.ok(!t.includes(`mcp__rea__${n}`), n);
  }
  assert.match(fs.readFileSync(path.join(__dirname, 'reverser-live.md'), 'utf8'), /raw debugger consoles are not available/i);
});

test('reverser (static): no runtime tool', () => {
  const bad = tools('reverser').filter((t) => /^mcp__rea__(capture_|observe_|start_frida|instrument_|gdb_|rizin_debug|install_adb)/.test(t));
  assert.deepStrictEqual(bad, []);
});

// An agent with a `tools:` list and no Skill tool cannot load a skill: it must get paths instead.
test('agents without the Skill tool are not told to load a skill', () => {
  for (const f of fs.readdirSync(__dirname).filter((n) => n.endsWith('.md'))) {
    const text = fs.readFileSync(path.join(__dirname, f), 'utf8');
    const m = text.match(/^tools:\s*(.+)$/m);
    if (!m || m[1].split(',').map((t) => t.trim()).includes('Skill')) continue;
    assert.doesNotMatch(text, /\b(load|use|run|follow)\b[^.\n]{0,40}\bskill\b/i, f);
  }
});

test('reviewer: runs the detector through the plugin wrapper, by a path that exists', () => {
  const reviewer = fs.readFileSync(path.join(__dirname, 'reviewer.md'), 'utf8');
  assert.match(reviewer, /node "\$\{CLAUDE_PLUGIN_ROOT\}\/hooks\/impeccable\.js" detect --json/);
  assert.ok(fs.existsSync(path.join(__dirname, '..', 'hooks', 'impeccable.js')));
});

test('reviewer: the npx fallback is pinned to the bundled Impeccable version', () => {
  const version = fs.readFileSync(path.join(__dirname, '..', 'skills', 'impeccable', 'SKILL.md'), 'utf8').match(/^version:\s*(\S+)/m)[1];
  const reviewer = fs.readFileSync(path.join(__dirname, 'reviewer.md'), 'utf8');
  assert.ok(reviewer.includes(`npx -y impeccable@${version}`));
  assert.ok(!/npx impeccable(?!@)/.test(reviewer));
});
