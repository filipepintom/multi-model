#!/usr/bin/env node
// Atualiza as skills de terceiros incluídas no plugin (vendored) a partir de cópias locais, e regista a versão.
//
//   node scripts/vendor.js impeccable <pasta-da-skill-impeccable>
//   node scripts/vendor.js ponytail   <pasta-do-plugin-ponytail>
//   node scripts/vendor.js graphify   <pasta-da-skill-graphify>
//   node scripts/vendor.js humanizer  <pasta-da-skill-humanizer>
//   node scripts/vendor.js context7   <pasta com SKILL.md (skills/context7-mcp) e LICENSE do repo upstash/context7>
//
// Lê o código novo antes de atualizar: estas skills correm com as permissões de quem usa o plugin.
// O binário do detetor do Impeccable (scripts/bin) não entra: o lançador descarrega o binário certo para cada
// sistema operativo na primeira utilização.

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SKILLS = path.join(ROOT, 'plugins', 'studio', 'skills');
const MANIFEST = path.join(ROOT, 'plugins', 'studio', 'vendor.json');

const [name, source] = process.argv.slice(2);
if (!name || !source) {
  console.error('Uso: node scripts/vendor.js <impeccable|ponytail|graphify|context7|humanizer> <pasta-de-origem>');
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
  fs.rmSync(dest, { recursive: true, force: true });
  fs.cpSync(source, dest, {
    recursive: true,
    filter: (src) => !src.replace(/\\/g, '/').includes('/scripts/bin'),
  });
  restoreLicence(dest, kept);
  manifest.impeccable = {
    source: 'https://github.com/pbakaus/impeccable',
    license: 'Apache-2.0',
    version: frontmatterVersion(path.join(dest, 'SKILL.md')),
    updated: today,
    notes: 'Sem scripts/bin: o lançador descarrega o binário do detetor na primeira utilização.',
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
    notes: 'Só a skill. A injeção nos subagentes do estúdio é feita por hooks/subagent.js.',
  };
} else if (name === 'context7') {
  // Origem: pasta com SKILL.md (de skills/context7-mcp do repo upstash/context7) e o LICENSE do repo.
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
    notes: 'Só a skill de uso do servidor MCP remoto declarado em .mcp.json; a CLI ctx7 (Node >= 22.13) não é usada.',
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
    notes: 'Só a skill. Usada na entrega (README, delivery.md, docs para pessoas) e no report.md da auditoria; nunca em specs, planos ou outros contratos entre agentes.',
  };
} else if (name === 'graphify') {
  const dest = path.join(SKILLS, 'graphify');
  const kept = keepLicence(dest, source);
  fs.rmSync(dest, { recursive: true, force: true });
  fs.cpSync(source, dest, { recursive: true });
  // Única alteração: só por invocação explícita. A descrição original faz a skill disparar em qualquer pergunta
  // sobre código, o que num plugin partilhado interfere com o trabalho normal de toda a gente.
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
    notes: 'Alterado: disable-model-invocation (só /studio:graphify). Na primeira utilização instala o pacote Python graphifyy.',
  };
} else {
  console.error(`Skill desconhecida: ${name}`);
  process.exit(1);
}

fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');
console.log(`${name} ${manifest[name].version} copiado para plugins/studio/skills/${name === 'context7' ? 'context7-mcp' : name}`);
