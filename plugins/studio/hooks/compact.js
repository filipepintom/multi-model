#!/usr/bin/env node
// PostCompact: records that a compaction happened during a studio build or audit, to measure whether the pipeline
// outgrows the context window before adding any context management.
// Appends one JSON line to docs/studio/<slug>/compactions.jsonl of the in-progress run (state.md with a phase other
// than "done"; the most recently modified one if there are several). A separate file because the orchestrator
// rewrites state.md each phase. Never stores the compaction summary: it carries project content.
// Silent and fail-open: no output, always exit 0.

const fs = require('fs');
const path = require('path');

// The project root: CLAUDE_PROJECT_DIR, or the nearest folder above the hook's cwd that has docs/studio, without
// leaving the git repository (a parent folder's run is not this project's).
function root(data) {
  const candidates = [];
  if (process.env.CLAUDE_PROJECT_DIR) candidates.push(process.env.CLAUDE_PROJECT_DIR);
  for (let d = path.resolve(data.cwd || process.cwd()); ; d = path.dirname(d)) {
    candidates.push(d);
    if (fs.existsSync(path.join(d, '.git')) || path.dirname(d) === d) break;
  }
  return candidates.find((d) => fs.existsSync(path.join(d, 'docs', 'studio'))) || null;
}

function inProgress(dir) {
  const runs = [];
  for (const slug of fs.readdirSync(dir)) {
    const state = path.join(dir, slug, 'state.md');
    let text;
    try { text = fs.readFileSync(state, 'utf8'); } catch { continue; }
    const phase = (/^phase:\s*(.+?)\s*$/m.exec(text) || [])[1];
    if (phase && phase !== 'done') runs.push({ slug, phase, mtime: fs.statSync(state).mtimeMs });
  }
  return runs.sort((a, b) => b.mtime - a.mtime)[0] || null;
}

function record(data) {
  const base = root(data);
  if (!base) return;
  const dir = path.join(base, 'docs', 'studio');
  const run = inProgress(dir);
  if (!run) return;
  const line = {
    date: new Date().toISOString(),
    trigger: data.trigger || null,
    phase: run.phase,
    session: data.session_id || null,
    ...(data.agent_id ? { agent: data.agent_id, agent_type: data.agent_type || null } : {}),
  };
  fs.appendFileSync(path.join(dir, run.slug, 'compactions.jsonl'), JSON.stringify(line) + '\n');
}

let raw = '';
let done = false;
function finish() {
  if (done) return;
  done = true;
  try {
    const data = JSON.parse(raw);
    if (!data.hook_event_name || data.hook_event_name === 'PostCompact') record(data);
  } catch {
    // fail-open
  }
  process.exit(0);
}

process.stdin.on('data', (c) => { raw += c; });
process.stdin.on('end', finish);
process.stdin.on('error', finish);
setTimeout(finish, 1500);
