#!/usr/bin/env node
// Gera uma cópia do plugin que usa a skill frontend-design da Anthropic no lugar do Impeccable, para A/B com --plugin:
//
//   node evals/ab/com-frontend-design.js <pasta-do-plugin-frontend-design> <pasta-de-saída>
//
// <pasta-do-plugin-frontend-design> é a raiz do plugin oficial (a que tem skills/frontend-design/SKILL.md), por exemplo
// ~/.claude/plugins/cache/claude-plugins-official/frontend-design/<versão>.
//
// Sai o Impeccable inteiro (skill, hooks e detetor), para não haver duas skills de design com instruções contrárias.
// Fica a estrutura da etapa de design: direção antes da gate 1, PRODUCT.md e DESIGN.md, sistema visual como primeira
// tarefa de UI e design gate na revisão, agora sem detetor. A frontend-design não escreve PRODUCT.md nem DESIGN.md: o
// plano de design dela (cor, tipo, layout, princípios) passa a ser o DESIGN.md, e o orquestrador escreve o PRODUCT.md.

const fs = require('fs');
const path = require('path');

// Fatores opcionais, um por variante, para saber o que achata as páginas dentro do pipeline:
//   --sem-ponytail   tira a injeção do Ponytail (orquestrador e subagentes)
//   --ui-inteira     o implementador de UI constrói tudo o que o DESIGN.md descreve, com o processo de construção e de
//                    autocrítica da skill, em vez de "aplicar princípios" dentro da direção
//   --effort-high    implementadores com effort high em vez de medium

const SOURCE = path.resolve(__dirname, '..', '..', 'plugins', 'studio');
const flags = new Set(process.argv.slice(2).filter((a) => a.startsWith('--')));
const [fd, outArg] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const skill = fd && path.join(path.resolve(fd), 'skills', 'frontend-design');
if (!fd || !outArg || !fs.existsSync(path.join(skill, 'SKILL.md'))) {
  console.error('uso: node evals/ab/com-frontend-design.js <pasta-do-plugin-frontend-design> <pasta-de-saída>');
  process.exit(2);
}
const out = path.resolve(outArg);

fs.rmSync(out, { recursive: true, force: true });
fs.cpSync(SOURCE, out, { recursive: true });
fs.rmSync(path.join(out, 'skills', 'impeccable'), { recursive: true });
// Esta variante testa o pipeline completo: o modo página (que entrou no plugin na 0.13.0) e o seu agente saem da cópia.
fs.rmSync(path.join(out, 'agents', 'designer.md'), { force: true });
fs.cpSync(skill, path.join(out, 'skills', 'frontend-design'), { recursive: true });

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
  [/^   - \*\*Page\*\* if .*\n/m, ''],
  [/^## Page mode\n[\s\S]*?(?=^## Fast mode)/m, ''],
  [/^- \*\*Use the `studio:impeccable` skill\*\*.*$/m,
    '- **Use the `studio:frontend-design` skill** (included in the plugin): make its design plan (color, type, layout, principles), review it against the brief as the skill says, and write the revised plan as `DESIGN.md`, with typography, color, spacing, components and tokens. Write `PRODUCT.md` yourself (who uses it, in what situation, to do what). What you need to ask the user is part of the gate 1 conversation. With `--auto`, infer from the request and mark what you inferred.'],
  [/^3\. \*\*Interface:\*\* if the diff touches UI.*$/m,
    '3. **Interface:** if the diff touches UI, the review includes the **design gate** (see `studio:reviewer`): the reviewer opens the running app on desktop and on mobile and checks it against `DESIGN.md`, and its findings go into the verdict.'],
]);
edit('skills/build/templates/spec.md', [[/With the `studio:impeccable` skill/, 'With the `studio:frontend-design` skill']]);
edit('agents/implementer.md', [
  [/^- Load the `studio:impeccable` skill.*$/m,
    '- Load the `studio:frontend-design` skill (included in the plugin) before editing UI. The direction is already chosen in `DESIGN.md`, so do not make a new design plan: apply the skill\'s design principles, its restraint and self-critique, and its guidance on writing, inside that direction.'],
  /^- The plugin's design detector runs.*\n/m,
]);
edit('agents/reviewer.md', [
  [/^   - Start the app and run the Impeccable detector.*\n(?:.*\n)*?(?=^   - Confirm that the UI)/m,
    '   - Start the app and look at the rendered pages on desktop (1440 wide) and on mobile (390 wide). Reading the source code is not enough. If the app requires login, also look at the authenticated pages (for example with a test session), not just the login screen.\n'],
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

if (flags.has('--sem-ponytail')) {
  const c = JSON.parse(fs.readFileSync(hooksFile, 'utf8'));
  for (const [event, groups] of Object.entries(c.hooks)) {
    for (const group of groups) group.hooks = group.hooks.filter((h) => !h.command.includes('ponytail'));
    c.hooks[event] = groups.filter((g) => g.hooks.length);
    if (!c.hooks[event].length) delete c.hooks[event];
  }
  fs.writeFileSync(hooksFile, JSON.stringify(c, null, 2));
}
if (flags.has('--ui-inteira')) {
  edit('agents/implementer.md', [
    [/The direction is already chosen in `DESIGN\.md`, so do not make a new design plan: apply the skill's design principles, its restraint and self-critique, and its guidance on writing, inside that direction\./,
      '`DESIGN.md` is the design plan, already reviewed against the brief, so do not make another: build all of it, following the skill\'s guidance for building, self-critique (take screenshots and look at them) and writing. Everything `DESIGN.md` describes is the task, not an extra: rule 2 and any instruction to write less code decide how you build it, never whether an element of the design gets built.'],
  ]);
}
if (flags.has('--effort-high')) edit('agents/implementer.md', [[/^effort: medium$/m, 'effort: high']]);
// --desenhador-constroi: quem escolhe a direção é quem constrói o primeiro ecrã. O orquestrador deixa de fazer o plano
// de design; a primeira tarefa de UI (tier opus) segue a skill do princípio ao fim e escreve o DESIGN.md a partir do
// que construiu.
if (flags.has('--desenhador-constroi')) {
  edit('skills/build/SKILL.md', [
    [/^- \*\*Use the `studio:frontend-design` skill\*\*.*$/m,
      '- **The design task decides the direction, not you.** Do not make a design plan and do not write `DESIGN.md`. Write `PRODUCT.md` yourself (who uses it, in what situation, to do what) and, in the spec\'s "Design direction" section, only the mode, the context of use and the constraints the request states. The direction is chosen by the implementer of the **design task** (see the plan rules), who builds the first screen with the `studio:frontend-design` skill. With `--auto`, that implementer infers from the request and marks what it inferred.'],
    [/ In a new project with an interface, the first UI task is the \*\*visual system\*\*: the tokens, the typography, the base layout and the base components from `DESIGN\.md`, in tier `opus`\./,
      ' In a new project with an interface, the first UI task is the **design task**, in tier `opus`: its implementer loads the `studio:frontend-design` skill and follows it from start to end, with the user\'s request (quote it in full in the task prompt) and `PRODUCT.md` as the brief: design plan, review of the plan against the brief, build, self-critique with screenshots. It builds the first screen people see, with the tokens, the typography, the base layout and the base components, and then writes `DESIGN.md` from what it built (typography, color, spacing, components, tokens and the one bold element).'],
  ]);
  edit('agents/implementer.md', [
    [/^- Follow `DESIGN\.md`:/m,
      '- **Design task** (the task says so): there is no `DESIGN.md` yet and you are the designer. Load the `studio:frontend-design` skill and follow it from start to end with the request quoted in your task as the brief: design plan, review of the plan against the brief, build, self-critique with screenshots. Everything in your design plan is the task, not an extra: rule 2 and any instruction to write less code decide how you build it, never whether an element of the design gets built. When the screen is built, write `DESIGN.md` from it. The next two lines apply to the other UI tasks.\n- Follow `DESIGN.md`:'],
  ]);
}

const left = ['skills/build/SKILL.md', 'skills/build/templates/spec.md', 'agents/implementer.md', 'agents/reviewer.md', 'hooks/hooks.json']
  .filter((f) => /impeccable|detector/i.test(fs.readFileSync(path.join(out, f), 'utf8')));
if (left.length) throw new Error(`ainda há referências ao Impeccable em: ${left.join(', ')}`);
console.log(`plugin com frontend-design no lugar do Impeccable em ${out}`);
