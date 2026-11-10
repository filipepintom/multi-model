#!/usr/bin/env node
// Runs the bundled Impeccable launcher (telemetry off) with this process's argv and stdin.
// Why a wrapper: hooks.json commands must not depend on the shell (Git Bash, PowerShell or sh), so no VAR= prefix,
// no `|| true`, no exec bit. The reviewer uses it too (`node .../impeccable.js detect --json <url>`), for the same reasons.
// As a hook (`hook` argument) it fails open: the design detector never blocks or fails a session, whatever the launcher does.
// Any other command returns the launcher's exit code, so a caller can tell a failure from a clean run.

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const win = process.platform === 'win32';
const root = process.env.CLAUDE_PLUGIN_ROOT || path.resolve(__dirname, '..');
const dir = path.join(root, 'skills', 'impeccable', 'scripts');
const args = process.argv.slice(2);
const asHook = args[0] === 'hook';
const env = { ...process.env, IMPECCABLE_NO_TELEMETRY: '1' };

let status = 1;
try {
  const launcher = path.join(dir, win ? 'impeccable.cmd' : 'impeccable');
  if (fs.existsSync(launcher)) {
    // Node >= 18.20.2 refuses to spawn .cmd files without a shell (CVE-2024-27980), so quote the path there.
    const r = win ? spawnSync(`"${launcher}"`, args, { stdio: 'inherit', env, shell: true })
      : spawnSync('sh', [launcher, ...args], { stdio: 'inherit', env });
    status = r.status ?? 1;
  } else if (!asHook) {
    process.stderr.write(`Impeccable launcher not found: ${launcher}\n`);
  }
} catch (e) {
  if (!asHook) process.stderr.write(`Impeccable launcher failed: ${e.message}\n`);
}
process.exit(asHook ? 0 : status);
