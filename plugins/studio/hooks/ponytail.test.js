// Tests for ponytail.js. Run: node --test plugins/studio/hooks/ponytail.test.js
const { test } = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const HOOK = path.join(__dirname, 'ponytail.js');
const ROOT = path.resolve(__dirname, '..');

function run(input) {
  const r = spawnSync(process.execPath, [HOOK], {
    input: typeof input === 'string' ? input : JSON.stringify(input), encoding: 'utf8', timeout: 10000,
    env: { ...process.env, CLAUDE_PLUGIN_ROOT: ROOT },
  });
  assert.strictEqual(r.status, 0, r.stderr);
  return r.stdout ? JSON.parse(r.stdout).hookSpecificOutput : null;
}

test('studio subagents get Ponytail, under the 10,000 cap', () => {
  const out = run({ hook_event_name: 'SubagentStart', agent_type: 'studio:implementer' });
  assert.strictEqual(out.hookEventName, 'SubagentStart');
  assert.match(out.additionalContext, /^PONYTAIL MODE ACTIVE/);
  assert.ok(out.additionalContext.length < 10000, String(out.additionalContext.length));
});

test('the build orchestrator gets Ponytail on /studio:build', () => {
  const out = run({ hook_event_name: 'UserPromptSubmit', prompt: '  /studio:build "room booking"' });
  assert.strictEqual(out.hookEventName, 'UserPromptSubmit');
  assert.match(out.additionalContext, /^PONYTAIL MODE ACTIVE/);
});

test('without hook_event_name the event comes from the fields', () => {
  assert.strictEqual(run({ agent_type: 'studio:reviewer' }).hookEventName, 'SubagentStart');
  assert.strictEqual(run({ prompt: '/studio:build x' }).hookEventName, 'UserPromptSubmit');
});

test('other agents, other prompts and bad input get nothing', () => {
  for (const input of [
    { hook_event_name: 'SubagentStart', agent_type: 'Explore' },
    { hook_event_name: 'UserPromptSubmit', prompt: '/studio:audit payments' },
    { hook_event_name: 'UserPromptSubmit', prompt: 'please /studio:build x' },
    'not json',
    '',
  ]) assert.strictEqual(run(input), null, JSON.stringify(input));
});
