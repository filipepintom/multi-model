#!/usr/bin/env node
// Pre-release consistency check, no dependencies: node scripts/check-release.js [repo-root]
// Prints one line per problem and exits 1; prints "release check ok" otherwise.

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(process.argv[2] || path.join(__dirname, '..'));
const plugin = path.join(root, 'plugins', 'studio');
const problems = [];
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));

let vendor = {};
try { vendor = readJson(path.join(plugin, 'vendor.json')); } catch (e) { problems.push(`vendor.json unreadable: ${e.message}`); }

// README "Bundled skills" table: | **Name** 1.2.3 | ... (Context7 has no version and is skipped).
let readme = '';
try { readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8'); } catch (e) { problems.push(`README.md unreadable: ${e.code || e.message}`); }
const rows = new Set([...readme.matchAll(/^\| \*\*(\w+)\*\*/gm)].map((m) => m[1].toLowerCase()));
for (const m of readme.matchAll(/^\| \*\*(\w+)\*\* (\d[\d.]*)/gm)) {
  const entry = vendor[m[1].toLowerCase()];
  if (!entry) problems.push(`README lists ${m[1]} ${m[2]} but vendor.json has no such entry`);
  else if (entry.version !== m[2]) problems.push(`README says ${m[1]} ${m[2]} but vendor.json says ${entry.version}`);
}
if (readme) for (const k of Object.keys(vendor)) if (!rows.has(k)) problems.push(`vendor.json has ${k} but it has no README "Bundled skills" row`);

// Every skill folder is a studio skill or a vendored one.
const allowed = new Set(['build', 'audit', 'reverse', 'retro', 'setup', ...Object.keys(vendor).map((k) => (k === 'context7' ? 'context7-mcp' : k))]);
const skillsDir = path.join(plugin, 'skills');
if (fs.existsSync(skillsDir)) {
  for (const d of fs.readdirSync(skillsDir)) if (!allowed.has(d)) problems.push(`skills/${d} is neither a studio skill nor in vendor.json`);
}

// The Impeccable launcher must be executable: git mode 100755, or the file mode when the folder is not a git checkout.
const launcher = 'plugins/studio/skills/impeccable/scripts/impeccable';
const ls = spawnSync('git', ['-C', root, 'ls-files', '-s', launcher], { encoding: 'utf8' });
const mode = ls.stdout && ls.stdout.split(' ')[0];
// Windows has no exec bit, so outside a checkout there is nothing to check there.
if (mode ? mode !== '100755' : process.platform !== 'win32' && !(fs.existsSync(path.join(root, launcher)) && fs.statSync(path.join(root, launcher)).mode & 0o111)) {
  problems.push(`Impeccable launcher ${launcher} is not executable (git mode ${mode || 'untracked'})`);
}

// The launchers pin the engine hashes in SHA256SUMS: it must list the 5 assets of the VERSION in scripts/VERSION.
const impScripts = path.join(plugin, 'skills', 'impeccable', 'scripts');
try {
  const version = fs.readFileSync(path.join(impScripts, 'VERSION'), 'utf8').trim();
  const lines = fs.readFileSync(path.join(impScripts, 'SHA256SUMS'), 'utf8').split(/\r?\n/);
  if (lines[0].trim() !== `# engine-v${version}`) problems.push(`SHA256SUMS first line is not "# engine-v${version}" (VERSION is ${version})`);
  const listed = new Set(lines.filter((l) => /^[0-9a-f]{64}  \S+$/.test(l)).map((l) => l.slice(66)));
  for (const a of ['darwin-arm64', 'darwin-x64', 'linux-arm64', 'linux-x64', 'windows-x64.exe']) {
    if (!listed.has(`impeccable-${a}`)) problems.push(`SHA256SUMS has no hash for impeccable-${a}`);
  }
} catch (e) { problems.push(`Impeccable SHA256SUMS/VERSION unreadable: ${e.code || e.message}`); }

try {
  if (!readJson(path.join(plugin, '.claude-plugin', 'plugin.json')).version) problems.push('plugin.json has no version');
} catch (e) { problems.push(`plugin.json invalid: ${e.message}`); }

if (problems.length) { console.log(problems.join('\n')); process.exit(1); }
console.log('release check ok');
