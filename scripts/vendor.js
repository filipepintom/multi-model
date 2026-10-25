#!/usr/bin/env node
// Atualiza as skills de terceiros incluídas no plugin (vendored) a partir de cópias locais, e regista a versão.
//
//   node scripts/vendor.js impeccable <pasta-da-skill-impeccable>
//   node scripts/vendor.js ponytail   <pasta-do-plugin-ponytail>
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
  console.error('Uso: node scripts/vendor.js <impeccable|ponytail> <pasta-de-origem>');
  process.exit(1);
}

function frontmatterVersion(file) {
  const m = /^version:\s*(.+)$/m.exec(fs.readFileSync(file, 'utf8'));
  return m ? m[1].trim() : undefined;
}

const manifest = fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) : {};
const today = new Date().toISOString().slice(0, 10);

if (name === 'impeccable') {
  const dest = path.join(SKILLS, 'impeccable');
  fs.rmSync(dest, { recursive: true, force: true });
  fs.cpSync(source, dest, {
    recursive: true,
    filter: (src) => !src.replace(/\\/g, '/').includes('/scripts/bin'),
  });
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
} else {
  console.error(`Skill desconhecida: ${name}`);
  process.exit(1);
}

fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');
console.log(`${name} ${manifest[name].version} copiado para plugins/studio/skills/${name}`);
