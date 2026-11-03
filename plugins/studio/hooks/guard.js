#!/usr/bin/env node
// Deterministic studio guardrails (PreToolUse).
// Exit 2 blocks the tool and returns stderr to the agent; exit 0 lets it through.
// Internal errors let it through (fail-open): the guard must never break a session.
// It reads the command text, so it catches mistakes; it is not a sandbox against an agent that wants around it.

const fs = require('fs');
const os = require('os');
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

function git(args, cwd) {
  try { return execSync(`git ${args}`, { cwd, stdio: 'pipe', timeout: 5000 }).toString().trim(); } catch { return null; }
}

// Expands ~; on Windows also maps Git Bash and cygwin drive paths (/c/x, /cygdrive/c/x) to C:\x.
function msysToNative(p, platform = process.platform) {
  p = p.replace(/^~(?=$|[\\/])/, os.homedir());
  if (platform !== 'win32') return p;
  return p.replace(/^\/(?:cygdrive\/)?([a-z])(?=\/|$)(.*)$/i, (_, d, rest) => `${d.toUpperCase()}:${rest.replace(/\//g, '\\') || '\\'}`);
}

const real = (p) => { try { return fs.realpathSync.native(p); } catch { return path.resolve(p); } };

// ---- Secrets

const SECRET_PATTERNS = [
  [/AKIA[0-9A-Z]{16}/, 'AWS access key'],
  [/-----BEGIN (RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY( BLOCK)?-----/, 'private key'],
  [/\bghp_[A-Za-z0-9]{36}\b/, 'GitHub token'],
  [/\bgithub_pat_[A-Za-z0-9_]{40,}/, 'GitHub token'],
  [/\bsk-ant-[A-Za-z0-9_-]{20,}/, 'Anthropic API key'],
  [/\bsk-(proj-|svcacct-|admin-)?[A-Za-z0-9_-]{32,}/, 'API key'],
  [/\bsk_live_[A-Za-z0-9]{16,}/, 'Stripe live key'],
  [/\bxox[abprs]-[A-Za-z0-9-]{10,}/, 'Slack token'],
  [/\bAIza[0-9A-Za-z_-]{35}\b/, 'Google API key'],
];
const KEY_PREFIX = /^(AKIA|ghp_|github_pat_|sk-ant-|sk-(proj-|svcacct-|admin-)?|sk_live_|xox[abprs]-|AIza)/;
const PLACEHOLDER_WORD = /x{4,}|example|placeholder|changeme|redacted|dummy|your[_-]|[_-]here\b/i;

// .env.example and docs use keys like sk-ant-xxxx or AKIAIOSFODNN7EXAMPLE: a placeholder word or few distinct characters.
function isPlaceholder(match) {
  const body = match.replace(KEY_PREFIX, '').replace(/[^A-Za-z0-9]/g, '');
  return PLACEHOLDER_WORD.test(match) || new Set(body).size < 8;
}

function findSecret(text) {
  for (const [re, label] of SECRET_PATTERNS) {
    for (const m of text.matchAll(new RegExp(re.source, 'g'))) if (!isPlaceholder(m[0])) return label;
  }
  return null;
}

const isEnvFile = (p) => /^\.env(\..+)?$/.test(path.basename(p)) && !/\.(example|sample|template)$/.test(p);
const ENV_MSG = (p) => `Writing to ${path.basename(p)} is blocked: secrets do not go into agent-managed files. Use .env.example with placeholder values.`;

// ---- Command text

// Heredoc bodies are data (docs, file contents), not commands: drop them before looking for commands.
const stripHeredocs = (cmd) => cmd.replace(/<<-?\s*(['"]?)(\w+)\1([^\n]*)\n[\s\S]*?\n[ \t]*\2(?=\n|$)/g, '<<$2$3');

// Simple commands, each as tokens without quotes. Splits on ; & | ( ) ` and newlines outside quotes,
// so the commands inside $(…), (…) and `…` are checked on their own.
function parse(cmd) {
  const segs = [[]];
  let cur = '';
  let quote = null;
  let quoted = false;
  const endToken = () => { if (quoted || cur) segs[segs.length - 1].push(cur); cur = ''; quoted = false; };
  for (const ch of cmd) {
    if (quote) { if (ch === quote) quote = null; else cur += ch; }
    else if (ch === '"' || ch === "'") { quote = ch; quoted = true; }
    else if (/[;&|()`\n]/.test(ch)) { endToken(); if (segs[segs.length - 1].length) segs.push([]); }
    else if (/\s/.test(ch)) endToken();
    else cur += ch;
  }
  endToken();
  return segs.filter((s) => s.length);
}

// Index of the command word: the first token, after env assignments and wrappers such as sudo or xargs.
// `echo rm -rf /` is text, not a delete.
const PREFIX = /^(\w+=.*|sudo|env|command|builtin|exec|time|nohup|nice|xargs|if|then|else|do|while|until|[{!]|-\S+)$/;
function commandAt(tokens, re) {
  for (let i = 0; i < tokens.length; i++) {
    if (re.test(tokens[i])) return i;
    if (!PREFIX.test(tokens[i])) return -1;
  }
  return -1;
}

const FETCH = String.raw`(?:curl|wget|iwr|irm|Invoke-WebRequest|Invoke-RestMethod|base64\s+(?:-d|--decode)|certutil\s+-decode)`;
const SHELL = String.raw`(?:(?:ba|z|da|k|fi)?sh|pwsh|powershell|iex|Invoke-Expression)`;
const LANG = String.raw`(?:python[0-9.]*|node|perl|ruby|php)`;
const REMOTE_SCRIPT = [
  // curl … | [sudo] sh ; curl … | python (a language only when it reads the program from stdin). Not `||`.
  new RegExp(String.raw`\b${FETCH}\b(?:[^|\n]*\|(?!\|))+\s*(?:sudo\b(?:\s+-\S+)*\s+)?(?:${SHELL}\b|${LANG}(?:\s+-)?\s*(?=$|[;&|\n)]))`, 'i'),
  // bash <(curl …) ; sh -c "$(curl …)" ; eval "$(curl …)" ; source <(curl …)
  new RegExp(String.raw`\b(?:${SHELL}|${LANG}|eval|source)\b[^\n;&|]*(?:<\(|\$\(|\x60)\s*${FETCH}\b`, 'i'),
  // iex (curl …).Content ; iex ((New-Object Net.WebClient).DownloadString(…)) ; [scriptblock]::Create((iwr …))
  new RegExp(String.raw`(?:\b(?:iex|Invoke-Expression)\b|\[scriptblock\]::Create)[^\n;]*(?:\b${FETCH}\b|New-Object\s+Net\.WebClient|DownloadString)`, 'i'),
  // An encoded command hides the script from this guard.
  /\b(?:powershell|pwsh)(?:\.exe)?\b[^\n;&|]*\s-e(?:c|nc[a-z]*)?(?=\s|$)/i,
];

const DELETE_CMD = /^(?:\S*[\\/])?(rm|rmdir|rd|ri|del|erase|Remove-Item)(?:\.exe)?$/i;
const ROOT_TARGETS = [
  /^[\\/]\*?$/, // /  /*
  /^~[\\/]?\*?$/, // ~  ~/  ~/*
  /^\$\{?HOME\}?[\\/]?\*?$/, // $HOME  ${HOME}/*
  /^\$env:(USERPROFILE|HOMEPATH|HOMEDRIVE|HOME)[\\/]?\*?$/i, // PowerShell home
  /^%(USERPROFILE|HOMEPATH|HOMEDRIVE)%[\\/]?\*?$/i, // cmd home
  /^(\.\.[\\/])*\.\.[\\/]?\*?$/, // ..  ../..  ../../*
  /^[A-Za-z]:[\\/]?\*?$/, // C:  C:\  C:/  C:\*
  /^[\\/][A-Za-z][\\/]?\*?$/, // /c  /c/  (a Git Bash drive)
];

function checkDelete(tokens) {
  const i = commandAt(tokens, DELETE_CMD);
  if (i < 0) return;
  const cmdStyle = /^(rd|rmdir|del|erase)$/i.test(DELETE_CMD.exec(tokens[i])[1]); // cmd.exe takes /s /q switches
  for (const t of tokens.slice(i + 1)) {
    if (t.startsWith('-') || (cmdStyle && /^\/[A-Za-z]$/.test(t))) continue;
    if (ROOT_TARGETS.some((re) => re.test(t))) {
      block('Deleting the root, a drive, the home folder or a parent folder is blocked. Delete specific paths inside the project.');
    }
  }
}

const WRITERS = /^(tee|cp|mv|copy|move|Copy-Item|Move-Item|Set-Content|Add-Content|Out-File|New-Item)$/i;

// Writes to .env through the shell: redirects, tee, cp/mv destinations and the PowerShell writers.
function checkEnvWrite(tokens) {
  const targets = [];
  tokens.forEach((t, k) => {
    const m = /^\d*>>?(.*)$/.exec(t);
    if (m) targets.push(m[1] || tokens[k + 1]);
  });
  const i = commandAt(tokens, WRITERS);
  if (i >= 0) {
    const name = tokens[i].toLowerCase();
    const args = tokens.slice(i + 1);
    const named = (re) => { const k = args.findIndex((a) => re.test(a)); return k >= 0 ? args[k + 1] : undefined; };
    const pos = args.filter((a) => !a.startsWith('-'));
    if (name === 'tee') targets.push(...pos);
    else if (/^(cp|mv|copy|move|copy-item|move-item)$/.test(name)) targets.push(named(/^-Destination$/i) ?? pos[pos.length - 1]);
    else targets.push(named(/^-(Path|FilePath|LiteralPath)$/i) ?? pos[0]);
  }
  const hit = targets.find((t) => t && isEnvFile(t));
  if (hit) block(ENV_MSG(hit));
}

const GIT_VALUE_OPTS = /^(-c|-C|--git-dir|--work-tree|--namespace|--exec-path|--config-env)$/;

function gitCall(tokens, dir) {
  const i = commandAt(tokens, /^(?:\S*[\\/])?git(?:\.exe)?$/i);
  if (i < 0) return null;
  let j = i + 1;
  while (j < tokens.length && tokens[j].startsWith('-')) {
    if (tokens[j] === '-C' && tokens[j + 1]) dir = path.resolve(dir, msysToNative(tokens[j + 1]));
    j += GIT_VALUE_OPTS.test(tokens[j]) ? 2 : 1;
  }
  return { sub: tokens[j] || '', args: tokens.slice(j + 1), dir };
}

function checkPush(args, dir) {
  const flags = args.filter((a) => a.startsWith('-'));
  const rest = args.filter((a) => !a.startsWith('-'));
  if (flags.some((f) => /^(-[a-zA-Z]*f[a-zA-Z]*|--force(-with-lease|-if-includes)?(=.*)?)$/.test(f)) || rest.some((r) => r.startsWith('+'))) {
    block('Force push is blocked in studio projects. Ask the user.');
  }
  const current = () => git('rev-parse --abbrev-ref HEAD', dir);
  const upstream = () => (git('rev-parse --abbrev-ref --symbolic-full-name @{u}', dir) || '').replace(/^[^/]+\//, '');
  // Without a refspec git pushes the current branch, to its upstream; HEAD and a bare name also name the destination.
  const targets = flags.some((f) => /^(--all|--mirror|--branches)$/.test(f)) ? ['main']
    : rest.length < 2 ? [current(), upstream()]
      : rest.slice(1).map((r) => {
        const [src, dst] = r.split(':');
        const d = (dst ?? src) || current();
        return d === 'HEAD' ? current() : d;
      });
  if (targets.some((t) => /^(refs\/heads\/)?(main|master)$/.test(t || ''))) {
    block('Push to main/master is blocked: delivery goes through the user\'s gate 2.');
  }
}

// Commit gate: .studio/verify must be green in the tree being committed (an implementer worktree, not the session folder).
function checkCommit(args, dir, studioRoot) {
  if (args.includes('--dry-run')) return;
  const verifyFile = path.join(studioRoot, '.studio', 'verify');
  if (!fs.existsSync(verifyFile)) return;
  const verify = fs.readFileSync(verifyFile, 'utf8').trim();
  if (!verify) return;
  const top = git('rev-parse --show-toplevel', dir);
  // A toplevel above the studio root is a monorepo: verify stays in the studio folder.
  const runIn = top && !path.relative(real(studioRoot), real(top)).startsWith('..') ? real(top) : studioRoot;
  try {
    execSync(verify, { cwd: runIn, stdio: 'pipe', timeout: 9 * 60 * 1000 });
  } catch (err) {
    const out = `${err.stdout || ''}${err.stderr || ''}`.trim().split('\n').slice(-40).join('\n');
    block(`Commit blocked: verification failed (\`${verify}\` in ${runIn}). Fix it before committing.\n${out}`);
  }
}

// The script a shell or eval runs: bash -c "…", cmd /c …, powershell -Command …, eval …. Never powershell -File.
const SHELL_CMD = /^(?:(?:\S*[\\/])?(bash|sh|zsh|dash|ksh|cmd|powershell|pwsh)(?:\.exe)?|(eval))$/i;
function innerScript(tokens) {
  const i = commandAt(tokens, SHELL_CMD);
  if (i < 0) return null;
  const m = SHELL_CMD.exec(tokens[i]);
  const name = (m[1] || m[2]).toLowerCase();
  const args = tokens.slice(i + 1);
  if (name === 'eval') return args.join(' ');
  if (name === 'cmd') {
    const k = args.findIndex((a) => /^\/\/?[ck]$/i.test(a));
    return k < 0 ? null : args.slice(k + 1).join(' ');
  }
  if (name === 'powershell' || name === 'pwsh') {
    const isCommand = (a) => a.length > 1 && '-command'.startsWith(a.toLowerCase());
    const k = args.findIndex((a) => isCommand(a) || /^-file$/i.test(a));
    return k < 0 || !isCommand(args[k]) ? null : args.slice(k + 1).join(' ');
  }
  const k = args.findIndex((a) => /^-[a-zA-Z]*c[a-zA-Z]*$/.test(a));
  return k < 0 ? null : args[k + 1] ?? null;
}

function checkCommand(cmd, cwd, depth = 0) {
  if (depth > 3) return;
  const text = stripHeredocs(cmd);
  if (REMOTE_SCRIPT.some((re) => re.test(text))) {
    block('Running scripts downloaded from the internet directly is blocked. Download, read, and only then run — with the user\'s approval.');
  }
  const secret = findSecret(cmd);
  if (secret) block(`The command appears to contain a secret (${secret}). Use environment variables.`);

  let dir = path.resolve(cwd ? msysToNative(cwd) : process.cwd());
  for (const tokens of parse(text)) {
    checkDelete(tokens);
    checkEnvWrite(tokens);
    const inner = innerScript(tokens);
    if (inner) checkCommand(inner, dir, depth + 1);
    if (/^(cd|chdir|pushd|Set-Location|sl)$/i.test(tokens[0])) {
      const target = tokens.slice(1).find((t) => !t.startsWith('-'));
      if (!target) dir = os.homedir();
      else if (!/[$%*]|^-$/.test(target)) dir = path.resolve(dir, msysToNative(target));
      continue;
    }
    // Rules only for studio-managed projects.
    const call = gitCall(tokens, dir);
    const studioRoot = call && findStudioRoot(call.dir);
    if (!studioRoot) continue;
    if (call.sub === 'push') checkPush(call.args, call.dir);
    if (call.sub === 'commit') checkCommit(call.args, call.dir, studioRoot);
  }
}

function checkWrite(input) {
  const filePath = input.file_path || '';
  if (isEnvFile(filePath)) block(ENV_MSG(filePath));
  const parts = [input.content, input.new_string];
  if (Array.isArray(input.edits)) for (const e of input.edits) parts.push(e.new_string);
  const secret = findSecret(parts.filter(Boolean).join('\n'));
  if (secret) block(`The content appears to contain a secret (${secret}) in ${path.basename(filePath)}. Use environment variables.`);
}

if (require.main === module) {
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
} else module.exports = { msysToNative };
