#!/usr/bin/env node
// Updates the third-party skills bundled in the plugin (vendored) from local copies, and records the version.
//
//   node scripts/vendor.js impeccable <impeccable-skill-folder>
//   node scripts/vendor.js ponytail   <ponytail-plugin-folder>
//   node scripts/vendor.js graphify   <graphify-skill-folder>
//   node scripts/vendor.js humanizer  <humanizer-skill-folder>
//   node scripts/vendor.js context7   <folder with SKILL.md (skills/context7-mcp) and the LICENSE of the upstash/context7 repo>
//   node scripts/vendor.js frontend-design <root of Anthropic's frontend-design plugin (has skills/frontend-design)>
//
// Read the new code before updating: these skills run with the permissions of whoever uses the plugin.
// The Impeccable detector binary (scripts/bin) is left out: the launcher downloads the right binary for each
// operating system on first use.

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SKILLS = path.join(ROOT, 'plugins', 'studio', 'skills');
const MANIFEST = path.join(ROOT, 'plugins', 'studio', 'vendor.json');

const [name, source] = process.argv.slice(2);
if (!name || !source) {
  console.error('Usage: node scripts/vendor.js <impeccable|ponytail|graphify|context7|humanizer|frontend-design> <source-folder>');
  process.exit(1);
}
// Every branch deletes the vendored folder before copying: a mistyped source must stop here, not after the delete.
if (!fs.existsSync(source)) {
  console.error(`${source} does not exist: nothing was changed.`);
  process.exit(1);
}

function frontmatterVersion(file) {
  const m = /^version:\s*(.+)$/m.exec(fs.readFileSync(file, 'utf8'));
  return m ? m[1].trim() : undefined;
}

// A skill with both a ```powershell and a ```bash fence is a mixed-dialect copy (upstream ships one variant per OS).
// Checked on the source, before any destination is deleted.
function assertSingleDialect(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) assertSingleDialect(p);
    else if (entry.name === 'SKILL.md') {
      const text = fs.readFileSync(p, 'utf8');
      if (/```powershell/i.test(text) && /```bash/i.test(text)) {
        console.error(`${p} has both a powershell and a bash fence: mixed-dialect skill, nothing was changed.`);
        process.exit(1);
      }
    }
  }
}
if (fs.existsSync(source)) assertSingleDialect(source);

// Preflight, before any rmSync: the skill must end up with a LICENSE, either from the source or already in place.
// Returns the current LICENSE/NOTICE so they survive the delete when the source has none.
function keepLicence(dest, src) {
  const kept = {};
  for (const f of ['LICENSE', 'NOTICE']) {
    if (fs.existsSync(path.join(dest, f))) kept[f] = fs.readFileSync(path.join(dest, f));
  }
  if (!fs.existsSync(path.join(src, 'LICENSE')) && !kept.LICENSE) {
    console.error(`${src} has no LICENSE and ${dest} has none either: the licence text must travel with the copy, nothing was changed.`);
    process.exit(1);
  }
  return kept;
}
function restoreLicence(dest, kept) {
  for (const [f, data] of Object.entries(kept)) {
    if (!fs.existsSync(path.join(dest, f))) fs.writeFileSync(path.join(dest, f), data);
  }
}

const manifest = fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) : {};
const today = new Date().toISOString().slice(0, 10);

if (name === 'impeccable') {
  const dest = path.join(SKILLS, 'impeccable');
  const kept = keepLicence(dest, source);
  const sumsFile = path.join(dest, 'scripts', 'SHA256SUMS');
  const sums = fs.existsSync(sumsFile) ? fs.readFileSync(sumsFile) : null;
  fs.rmSync(dest, { recursive: true, force: true });
  fs.cpSync(source, dest, {
    recursive: true,
    filter: (src) => !src.replace(/\\/g, '/').includes('/scripts/bin'),
  });
  restoreLicence(dest, kept);
  if (sums && !fs.existsSync(sumsFile)) fs.writeFileSync(sumsFile, sums);
  console.log('Reminder: scripts/SHA256SUMS must match scripts/VERSION (hashes of the engine-v<VERSION> release assets); check-release.js verifies it.');
  manifest.impeccable = {
    source: 'https://github.com/pbakaus/impeccable',
    license: 'Apache-2.0',
    version: frontmatterVersion(path.join(dest, 'SKILL.md')),
    updated: today,
    notes: 'No scripts/bin: the launcher downloads the detector binary on first use.',
  };
} else if (name === 'ponytail') {
  const dest = path.join(SKILLS, 'ponytail');
  fs.rmSync(dest, { recursive: true, force: true });
  fs.mkdirSync(dest, { recursive: true });
  fs.copyFileSync(path.join(source, 'skills', 'ponytail', 'SKILL.md'), path.join(dest, 'SKILL.md'));
  fs.copyFileSync(path.join(source, 'LICENSE'), path.join(dest, 'LICENSE'));
  const pkg = JSON.parse(fs.readFileSync(path.join(source, '.claude-plugin', 'plugin.json'), 'utf8'));
  manifest.ponytail = {
    source: 'https://github.com/DietrichGebert/ponytail',
    license: 'MIT',
    version: pkg.version,
    updated: today,
    notes: 'Skill only. hooks/ponytail.js injects it into the studio subagents and the build orchestrator.',
  };
} else if (name === 'context7') {
  // Source: folder with SKILL.md (from skills/context7-mcp in the upstash/context7 repo) and the repo's LICENSE.
  const dest = path.join(SKILLS, 'context7-mcp');
  fs.rmSync(dest, { recursive: true, force: true });
  fs.mkdirSync(dest, { recursive: true });
  fs.copyFileSync(path.join(source, 'SKILL.md'), path.join(dest, 'SKILL.md'));
  fs.copyFileSync(path.join(source, 'LICENSE'), path.join(dest, 'LICENSE'));
  manifest.context7 = {
    source: 'https://github.com/upstash/context7 (skills/context7-mcp)',
    license: 'MIT',
    version: 'master',
    updated: today,
    notes: 'Only the skill for using the remote MCP server declared in .mcp.json; the ctx7 CLI (Node >= 22.13) is not used.',
  };
} else if (name === 'humanizer') {
  const dest = path.join(SKILLS, 'humanizer');
  fs.rmSync(dest, { recursive: true, force: true });
  fs.mkdirSync(dest, { recursive: true });
  fs.copyFileSync(path.join(source, 'SKILL.md'), path.join(dest, 'SKILL.md'));
  fs.copyFileSync(path.join(source, 'LICENSE'), path.join(dest, 'LICENSE'));
  const m = /version:\s*"?([\d.]+)"?/.exec(fs.readFileSync(path.join(dest, 'SKILL.md'), 'utf8'));
  manifest.humanizer = {
    source: 'https://github.com/blader/humanizer',
    license: 'MIT',
    version: m ? m[1] : undefined,
    updated: today,
    notes: 'Skill only. Used on delivery (README, delivery.md, docs for people) and in the audit report.md; never on specs, plans or other contracts between agents.',
  };
} else if (name === 'graphify') {
  const dest = path.join(SKILLS, 'graphify');
  const kept = keepLicence(dest, source);
  fs.rmSync(dest, { recursive: true, force: true });
  fs.cpSync(source, dest, { recursive: true });
  // The only change: explicit invocation only. The original description makes the skill fire on any question
  // about code, which in a shared plugin gets in the way of everyone's normal work.
  const skill = path.join(dest, 'SKILL.md');
  const text = fs.readFileSync(skill, 'utf8');
  if (!/^disable-model-invocation:/m.test(text)) {
    fs.writeFileSync(skill, text.replace(/^(description:.*)$/m, '$1\ndisable-model-invocation: true'));
  }
  // Pin unpinned graphifyy installs to the vendored version, so a re-vendor keeps the pin.
  const versionFile = path.join(source, '.graphify_version');
  if (fs.existsSync(versionFile)) {
    const pin = fs.readFileSync(versionFile, 'utf8').trim();
    const pinFile = (f) => {
      const s = fs.readFileSync(f, 'utf8');
      const r = s.split('\n').map((l) => (/(pip|uv tool) install/.test(l) && l.includes('graphifyy')
        ? l.replace(/ --upgrade/, '').replace(/graphifyy(\[[^\]]*\])?(?![=\w[])/g, `graphifyy$1==${pin}`) : l)).join('\n');
      if (r !== s) fs.writeFileSync(f, r);
    };
    pinFile(skill);
    const refs = path.join(dest, 'references');
    if (fs.existsSync(refs)) for (const f of fs.readdirSync(refs)) if (f.endsWith('.md')) pinFile(path.join(refs, f));
  }
  restoreLicence(dest, kept);
  manifest.graphify = {
    source: 'https://github.com/safishamsi/graphify',
    license: 'MIT OR Apache-2.0',
    version: fs.existsSync(versionFile) ? fs.readFileSync(versionFile, 'utf8').trim() : undefined,
    updated: today,
    notes: 'Changed: disable-model-invocation (only /studio:graphify). On first use it installs the graphifyy Python package.',
  };
} else if (name === 'frontend-design') {
  // Source: the root of Anthropic's frontend-design plugin. The skill is copied unmodified. Its licence file is
  // LICENSE.txt (the SKILL.md names it), so it is kept under that name and also copied as LICENSE, the name the
  // licence test looks for.
  const src = path.join(source, 'skills', 'frontend-design');
  if (!fs.existsSync(path.join(src, 'SKILL.md')) || !fs.existsSync(path.join(src, 'LICENSE.txt'))) {
    console.error(`${src} has no SKILL.md or no LICENSE.txt: nothing was changed.`);
    process.exit(1);
  }
  const dest = path.join(SKILLS, 'frontend-design');
  fs.rmSync(dest, { recursive: true, force: true });
  fs.mkdirSync(dest, { recursive: true });
  fs.copyFileSync(path.join(src, 'SKILL.md'), path.join(dest, 'SKILL.md'));
  fs.copyFileSync(path.join(src, 'LICENSE.txt'), path.join(dest, 'LICENSE.txt'));
  fs.copyFileSync(path.join(src, 'LICENSE.txt'), path.join(dest, 'LICENSE'));
  const pkg = JSON.parse(fs.readFileSync(path.join(source, '.claude-plugin', 'plugin.json'), 'utf8'));
  manifest['frontend-design'] = {
    source: 'https://github.com/anthropics/claude-plugins-official (plugins/frontend-design)',
    license: 'Apache-2.0',
    version: pkg.version,
    updated: today,
    notes: 'Skill only, unmodified. Loaded by studio:designer in page mode, where the Impeccable hook is turned off for the project.',
  };
} else {
  console.error(`Unknown skill: ${name}`);
  process.exit(1);
}

fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');
console.log(`${name} ${manifest[name].version} copied to plugins/studio/skills/${name === 'context7' ? 'context7-mcp' : name}`);
