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
const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
for (const m of readme.matchAll(/^\| \*\*(\w+)\*\* (\d[\d.]*)/gm)) {
  const entry = vendor[m[1].toLowerCase()];
  if (!entry) problems.push(`README lists ${m[1]} ${m[2]} but vendor.json has no such entry`);
  else if (entry.version !== m[2]) problems.push(`README says ${m[1]} ${m[2]} but vendor.json says ${entry.version}`);
}

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
if (mode ? mode !== '100755' : !(fs.existsSync(path.join(root, launcher)) && fs.statSync(path.join(root, launcher)).mode & 0o111)) {
  problems.push(`Impeccable launcher ${launcher} is not executable (git mode ${mode || 'untracked'})`);
}

try {
  if (!readJson(path.join(plugin, '.claude-plugin', 'plugin.json')).version) problems.push('plugin.json has no version');
} catch (e) { problems.push(`plugin.json invalid: ${e.message}`); }

if (problems.length) { console.log(problems.join('\n')); process.exit(1); }
console.log('release check ok');
