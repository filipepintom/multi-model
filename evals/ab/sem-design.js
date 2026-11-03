#!/usr/bin/env node
// Gera uma cópia do plugin sem a etapa de design, para A/B com --plugin:
//
//   node evals/ab/sem-design.js <pasta-de-saída>
//
// Sai o Impeccable (skill, hooks e detetor), o PRODUCT.md e o DESIGN.md, a direção visual na gate 1, a tarefa de sistema
// visual e a design gate da revisão. Ficam a spec, os testes, a revisão e a exigência de cobrir os estados e o telemóvel.

const fs = require('fs');
const path = require('path');

const SOURCE = path.resolve(__dirname, '..', '..', 'plugins', 'studio');
const out = path.resolve(process.argv[2] || '');
if (!process.argv[2]) {
  console.error('uso: node evals/ab/sem-design.js <pasta-de-saída>');
  process.exit(2);
}

fs.rmSync(out, { recursive: true, force: true });
fs.cpSync(SOURCE, out, { recursive: true });
fs.rmSync(path.join(out, 'skills', 'impeccable'), { recursive: true });

function edit(file, cuts) {
  const p = path.join(out, file);
  let text = fs.readFileSync(p, 'utf8');
  for (const [cut, by = ''] of cuts.map((c) => [].concat(c))) {
    if (!cut.test(text)) throw new Error(`${file}: não encontrei ${cut}`);
    text = text.replace(cut, by);
  }
  fs.writeFileSync(p, text);
}

edit('skills/build/SKILL.md', [
  / If the task touches UI, the implementer follows the existing `DESIGN\.md` and the review includes the design gate\./,
  /^4\. \*\*Design direction\*\*.*\n/m,
  / and, if there is an interface, the design direction/,
  /^### Design \(projects with an interface\)\n[\s\S]*?(?=^##)/m,
  / In a new project with an interface, the first UI task is the \*\*visual system\*\*.*/,
  / For `UI: yes` tasks, it also carries the paths of `DESIGN\.md` and `PRODUCT\.md`\./,
  /^3\. \*\*Interface:\*\* if the diff touches UI.*\n/m,
]);
edit('skills/build/templates/spec.md', [/^## Design direction\n[\s\S]*?(?=^## |(?![\s\S]))/m]);
edit('agents/implementer.md', [
  /^- Follow `DESIGN\.md`.*\n/m,
  /^- Load the `studio:impeccable` skill.*\n/m,
  /^- The plugin's design detector runs.*\n/m,
]);
edit('agents/reviewer.md', [
  /^   - Start the app and run the Impeccable detector.*\n(?:.*\n)*?(?=^   - Confirm that the UI)/m,
  [/Confirm that the UI follows `DESIGN\.md`: tokens instead of loose values and the visual system's components reused\. Also confirm/, 'Confirm'],
  [/\*\*UI \(if applicable\): design gate\.\*\*/, '**UI (if applicable).**'],
  /^   - If the detector is not available.*\n/m,
]);

const hooksFile = path.join(out, 'hooks', 'hooks.json');
const config = JSON.parse(fs.readFileSync(hooksFile, 'utf8'));
delete config.description;
for (const [event, groups] of Object.entries(config.hooks)) {
  for (const group of groups) group.hooks = group.hooks.filter((h) => !h.command.includes('impeccable'));
  config.hooks[event] = groups.filter((g) => g.hooks.length);
  if (!config.hooks[event].length) delete config.hooks[event];
}
fs.writeFileSync(hooksFile, JSON.stringify(config, null, 2));

const left = ['skills/build/SKILL.md', 'skills/build/templates/spec.md', 'agents/implementer.md', 'agents/reviewer.md', 'hooks/hooks.json']
  .filter((f) => /impeccable|DESIGN\.md|PRODUCT\.md|design gate/i.test(fs.readFileSync(path.join(out, f), 'utf8')));
if (left.length) throw new Error(`ainda há referências ao design em: ${left.join(', ')}`);
console.log(`plugin sem design em ${out}`);
