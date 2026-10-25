#!/usr/bin/env node
// SubagentStart: injects the Ponytail rules (skills/ponytail/SKILL.md, included in the plugin) into the studio subagents
// (agent_type "studio:*"). SessionStart context does not reach subagents, and they are the ones who write the code.
// Only the studio agents: subagents doing other work in the same session are not touched.
// Without a readable agent_type (empty or invalid stdin), nothing is injected: the hook never blocks or delays a subagent.

const fs = require('fs');
const path = require('path');

const PLUGIN_ROOT = process.env.CLAUDE_PLUGIN_ROOT || path.resolve(__dirname, '..');
const SKILL = path.join(PLUGIN_ROOT, 'skills', 'ponytail', 'SKILL.md');

function rules() {
  const body = fs.readFileSync(SKILL, 'utf8').replace(/^---[\s\S]*?\n---\s*/, '');
  return `PONYTAIL MODE ACTIVE — level: full\n\n${body.trim()}`;
}

let raw = '';
let done = false;
function finish() {
  if (done) return;
  done = true;
  try {
    const type = String(JSON.parse(raw).agent_type || '');
    if (type.startsWith('studio:')) {
      process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'SubagentStart', additionalContext: rules() } }));
    }
  } catch {
    // fail-open: no injection
  }
  process.exit(0);
}

process.stdin.on('data', (c) => { raw += c; });
process.stdin.on('end', finish);
process.stdin.on('error', finish);
setTimeout(finish, 1500);
