#!/usr/bin/env node
// Gera uma cópia do plugin com uma regra de contenção na etapa de design, para A/B com --plugin:
//
//   node evals/ab/com-contencao.js <pasta-de-saída>
//
// O Impeccable fica como está. A regra responde ao que o júri e o dono apontaram nas páginas da tarefa 024: recursos
// decorativos repetidos em todas as secções (filetes duplos, bordas tracejadas, degraus, linhas de números grandes).
// Pede um só elemento forte, feito dos factos do pedido, e o resto calmo.

const fs = require('fs');
const path = require('path');

const SOURCE = path.resolve(__dirname, '..', '..', 'plugins', 'studio');
const out = path.resolve(process.argv[2] || '');
if (!process.argv[2]) {
  console.error('uso: node evals/ab/com-contencao.js <pasta-de-saída>');
  process.exit(2);
}

fs.rmSync(out, { recursive: true, force: true });
fs.cpSync(SOURCE, out, { recursive: true });

function insertAfter(file, anchor, text) {
  const p = path.join(out, file);
  const before = fs.readFileSync(p, 'utf8');
  if (!anchor.test(before)) throw new Error(`${file}: não encontrei ${anchor}`);
  fs.writeFileSync(p, before.replace(anchor, (m) => `${m}${text}`));
}

insertAfter('skills/build/SKILL.md', /^- \*\*Use the `studio:impeccable` skill\*\*.*\n/m,
  '- **One bold element, made from the request.** Whatever direction the skill chooses, name in `DESIGN.md` the one element that carries it, and prefer one made from the request\'s own facts (hours, dates, routes, prices, quantities) over ornament. Everything else stays quiet. A decorative device is not repeated from section to section (rules, inner borders, shaped edges, rows of big numbers, a label on every block): what does not carry information from the request is cut. This rule wins over any push to add more of a visual world\'s devices.\n');
insertAfter('agents/implementer.md', /^- Load the `studio:impeccable` skill.*\n/m,
  '- `DESIGN.md` names one bold element: build that one fully and keep the rest quiet. Do not repeat a decorative device on every section; an element that carries no information from the request is cut.\n');
console.log(`plugin com a regra de contenção em ${out}`);
