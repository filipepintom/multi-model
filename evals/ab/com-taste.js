#!/usr/bin/env node
// Gera uma cópia do plugin que usa o Taste (Leonxlnx/taste-skill) quando o pedido melhora uma interface existente, para
// A/B com --plugin:
//
//   node evals/ab/com-taste.js <pasta-do-taste-skill> <pasta-de-saída>
//
// <pasta-do-taste-skill> é skills/taste-skill de um clone do repositório. Nas interfaces novas fica tudo como está: o
// Taste perdeu para o studio nesse caso e inventou conteúdo numa página sem fotografias. Nas melhorias substitui o
// Impeccable, para não haver duas skills de design com instruções contrárias, e nunca vai buscar imagens.

const fs = require('fs');
const path = require('path');

const SOURCE = path.resolve(__dirname, '..', '..', 'plugins', 'studio');
const [taste, outArg] = process.argv.slice(2);
if (!taste || !outArg || !fs.existsSync(path.join(taste, 'SKILL.md'))) {
  console.error('uso: node evals/ab/com-taste.js <pasta-do-taste-skill> <pasta-de-saída>');
  process.exit(2);
}
const out = path.resolve(outArg);

fs.rmSync(out, { recursive: true, force: true });
fs.cpSync(SOURCE, out, { recursive: true });
fs.cpSync(path.resolve(taste), path.join(out, 'skills', 'taste'), { recursive: true });

function insert(file, anchor, text) {
  const p = path.join(out, file);
  const before = fs.readFileSync(p, 'utf8');
  if (!anchor.test(before)) throw new Error(`${file}: não encontrei ${anchor}`);
  fs.writeFileSync(p, before.replace(anchor, (m) => `${text}${m}`));
}

const RULE = 'use the `studio:taste` skill instead of `studio:impeccable`: its app-screen run (`references/app-screens.md`) for screens people work in, its page run for pages. Never run its `scripts/assets.mjs` and add no images or facts the project does not already have.';
insert('skills/build/SKILL.md', /^- \*\*Use the `studio:impeccable` skill\*\*/m,
  `- **Improving an existing interface** (the request changes how an existing UI looks, not what it does): ${RULE} Write in the spec that this request is an improvement of an existing interface. The rest of this section applies only to new interfaces.\n`);
insert('agents/implementer.md', /^- Load the `studio:impeccable` skill/m,
  `- If the spec says the request improves an existing interface, ${RULE} In that case skip the next line.\n`);
console.log(`plugin com Taste nas melhorias em ${out}`);
