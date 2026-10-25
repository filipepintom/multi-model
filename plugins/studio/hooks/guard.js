#!/usr/bin/env node
// Deterministic studio guardrails (PreToolUse).
// Exit 2 blocks the tool and returns stderr to the agent; exit 0 lets it through.
// Internal errors let it through (fail-open): the guard must never break a session.

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function block(msg) {
  process.stderr.write(`[studio guard] ${msg}\n`);
  process.exit(2);
}

// Walks up from `dir` until it finds a .studio folder (a studio-managed project).
function findStudioRoot(dir) {
  let cur = path.resolve(dir || process.cwd());
  for (;;) {
    if (fs.existsSync(path.join(cur, '.studio'))) return cur;
    const parent = path.dirname(cur);
    if (parent === cur) return null;
    cur = parent;
  }
}

const SECRET_PATTERNS = [
  [/AKIA[0-9A-Z]{16}/, 'AWS access key'],
  [/-----BEGIN (RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY( BLOCK)?-----/, 'private key'],
  [/\bghp_[A-Za-z0-9]{36}\b/, 'GitHub token'],
  [/\bgithub_pat_[A-Za-z0-9_]{40,}/, 'GitHub token'],
  [/\bsk-ant-[A-Za-z0-9_-]{20,}/, 'Anthropic API key'],
  [/\bsk-(proj-)?[A-Za-z0-9]{32,}/, 'API key'],
  [/\bxox[abprs]-[A-Za-z0-9-]{10,}/, 'Slack token'],
  [/\bAIza[0-9A-Za-z_-]{35}\b/, 'Google API key'],
];

const ROOT_TARGET = String.raw`(\/|\/\*|~|~\/|~\/\*|\$HOME|\$HOME\/|\.\.|\.\.\/|[A-Za-z]:\\?|[A-Za-z]:\\\*)`;

function checkCommand(cmd, cwd) {
  if (new RegExp(String.raw`\brm\s+(-\w+\s+)*-\w*[rR]\w*\s+(-\w+\s+)*` + ROOT_TARGET + String.raw`(\s|;|&|\||$)`).test(cmd)) {
    block('Recursively deleting the root, the home folder or the parent folder is blocked. Delete specific paths inside the project.');
  }
  if (/\bRemove-Item\b/i.test(cmd) && /-Recurse\b/i.test(cmd) &&
      /(\s|['"])([A-Za-z]:\\?|~|\$HOME|\$env:USERPROFILE|\.\.)(['"]|\s|$)/i.test(cmd)) {
    block('Remove-Item -Recurse on a root, the home folder or the parent folder is blocked.');
  }
  if (/\b(curl|wget)\b[^|]*\|\s*(sudo\s+)?(ba|z)?sh\b/.test(cmd) ||
      /\b(iwr|irm|Invoke-WebRequest|Invoke-RestMethod)\b[^|]*\|\s*(iex|Invoke-Expression)\b/i.test(cmd) ||
      /\b(iex|Invoke-Expression)\s*\(?\s*\(?\s*(iwr|irm|Invoke-WebRequest|Invoke-RestMethod|New-Object\s+Net\.WebClient)/i.test(cmd)) {
    block('Running scripts downloaded from the internet directly is blocked. Download, read, and only then run — with the user\'s approval.');
  }

  const studioRoot = findStudioRoot(cwd);
  if (!studioRoot) return;

  // Rules only for studio-managed projects.
  if (/\bgit\s+push\b/.test(cmd)) {
    if (/\s(--force|-f)(\s|$)/.test(cmd) || /\s--force-with-lease\b/.test(cmd)) {
      block('Force push is blocked in studio projects. Ask the user.');
    }
    if (/\s(main|master)(\s|$)|:(main|master)(\s|$)/.test(cmd)) {
      block('Push to main/master is blocked: delivery goes through the user\'s gate 2.');
    }
  }

  // Commit gate: .studio/verify must be green.
  if (/\bgit\b(\s+-\S+(\s+\S+)?)*\s+commit\b/.test(cmd) && !/--dry-run/.test(cmd)) {
    const verifyFile = path.join(studioRoot, '.studio', 'verify');
    if (!fs.existsSync(verifyFile)) return;
    const verify = fs.readFileSync(verifyFile, 'utf8').trim();
    if (!verify) return;
    try {
      execSync(verify, { cwd: cwd || studioRoot, stdio: 'pipe', timeout: 9 * 60 * 1000 });
    } catch (err) {
      const out = `${err.stdout || ''}${err.stderr || ''}`.trim().split('\n').slice(-40).join('\n');
      block(`Commit blocked: verification failed (\`${verify}\`). Fix it before committing.\n${out}`);
    }
  }
}

function checkWrite(input) {
  const filePath = input.file_path || '';
  const base = path.basename(filePath);
  if (/^\.env(\..+)?$/.test(base) && !/\.(example|sample|template)$/.test(base)) {
    block(`Writing to ${base} is blocked: secrets do not go into agent-managed files. Use .env.example with placeholder values.`);
  }
  const parts = [input.content, input.new_string];
  if (Array.isArray(input.edits)) for (const e of input.edits) parts.push(e.new_string);
  const text = parts.filter(Boolean).join('\n');
  for (const [re, label] of SECRET_PATTERNS) {
    if (re.test(text)) {
      block(`The content appears to contain a secret (${label}) in ${base}. Use environment variables.`);
    }
  }
}

let raw = '';
process.stdin.on('data', (c) => { raw += c; });
process.stdin.on('end', () => {
  let data;
  try { data = JSON.parse(raw); } catch { process.exit(0); }
  const tool = data.tool_name || '';
  const input = data.tool_input || {};
  try {
    if (tool === 'Bash' || tool === 'PowerShell') checkCommand(input.command || '', data.cwd);
    else if (tool === 'Write' || tool === 'Edit' || tool === 'MultiEdit') checkWrite(input);
  } catch {
    // fail-open
  }
  process.exit(0);
});
