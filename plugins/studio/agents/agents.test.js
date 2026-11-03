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
