#!/usr/bin/env node
// Injects the Ponytail rules (skills/ponytail/SKILL.md, included in the plugin):
//   - SubagentStart: into the studio subagents (agent_type "studio:*"). SessionStart context does not reach subagents,
//     and they are the ones who write the code. Subagents doing other work in the same session are not touched.
//   - UserPromptSubmit: into the build orchestrator, on /studio:build.
// A separate hook from knowledge.js because Claude Code caps each hook's additionalContext at 10,000 characters:
// two hooks keep the lessons and Ponytail each under the cap.
// Without a readable event (empty or invalid stdin), nothing is injected: the hook never blocks or delays anything.

const fs = require('fs');
const path = require('path');

const PLUGIN_ROOT = process.env.CLAUDE_PLUGIN_ROOT || path.resolve(__dirname, '..');
const SKILL = path.join(PLUGIN_ROOT, 'skills', 'ponytail', 'SKILL.md');
const MAX_CHARS = 9500; // Claude Code's cap is 10,000; above it the text is replaced by a file path and a 2,000-character preview

function rules() {
  const body = fs.readFileSync(SKILL, 'utf8').replace(/^---[\s\S]*?\n---\s*/, '');
  return `PONYTAIL MODE ACTIVE — level: full\n\n${body.trim()}`.slice(0, MAX_CHARS);
}

// The event this input belongs to: hook_event_name when present, otherwise the field that only that event has.
function event(data) {
  if (data.hook_event_name) return data.hook_event_name;
  if (data.agent_type !== undefined) return 'SubagentStart';
  if (data.prompt !== undefined || data.user_prompt !== undefined) return 'UserPromptSubmit';
  return '';
}

function wanted(name, data) {
  if (name === 'SubagentStart') return String(data.agent_type || '').startsWith('studio:');
  if (name === 'UserPromptSubmit') return /^\s*\/studio:build\b/.test(String(data.prompt ?? data.user_prompt ?? ''));
  return false;
}

let raw = '';
let done = false;
function finish() {
  if (done) return;
  done = true;
  try {
    const data = JSON.parse(raw);
    const name = event(data);
    if (wanted(name, data)) {
      // Exit in the write callback so a pipe is flushed first.
      process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: name, additionalContext: rules() } }), () => process.exit(0));
      return;
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
