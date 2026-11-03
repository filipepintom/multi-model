#!/usr/bin/env node
// Runs the bundled Impeccable launcher (telemetry off) with this process's argv and stdin.
// Why a wrapper: hooks.json commands must not depend on the shell (Git Bash, PowerShell or sh), so no VAR= prefix,
// no `|| true`, no exec bit. Fail-open: the design detector never blocks or fails a session, whatever the launcher does.

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const win = process.platform === 'win32';
const root = process.env.CLAUDE_PLUGIN_ROOT || path.resolve(__dirname, '..');
const dir = path.join(root, 'skills', 'impeccable', 'scripts');
const args = process.argv.slice(2);
const env = { ...process.env, IMPECCABLE_NO_TELEMETRY: '1' };

try {
  const launcher = path.join(dir, win ? 'impeccable.cmd' : 'impeccable');
  if (fs.existsSync(launcher)) {
    // Node >= 18.20.2 refuses to spawn .cmd files without a shell (CVE-2024-27980), so quote the path there.
    if (win) spawnSync(`"${launcher}"`, args, { stdio: 'inherit', env, shell: true });
    else spawnSync('sh', [launcher, ...args], { stdio: 'inherit', env });
  }
} catch {
  // fail-open
}
process.exit(0);
