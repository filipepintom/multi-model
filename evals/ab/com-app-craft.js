#!/usr/bin/env node
// Gera uma cópia do plugin com as regras de ecrãs de aplicação (movimento, feedback, telemóvel, limites de dados),
// para A/B com --plugin:
//
//   node evals/ab/com-app-craft.js <pasta-de-saída>
//
// As regras estão em evals/ab/app-craft/app-craft.md, destiladas das skills de Emil Kowalski (MIT). Não entram como
// prosa para o implementador seguir: o orquestrador copia-as para a spec como critérios de aceitação, que é o
// mecanismo que o pipeline já cumpre (cada critério tem um teste). Só se aplicam ao modo operate.

const fs = require('fs');
const path = require('path');

const SOURCE = path.resolve(__dirname, '..', '..', 'plugins', 'studio');
const out = path.resolve(process.argv[2] || '');
if (!process.argv[2]) {
  console.error('uso: node evals/ab/com-app-craft.js <pasta-de-saída>');
  process.exit(2);
}

fs.rmSync(out, { recursive: true, force: true });
fs.cpSync(SOURCE, out, { recursive: true });
fs.copyFileSync(path.join(__dirname, 'app-craft', 'app-craft.md'), path.join(out, 'skills', 'build', 'app-craft.md'));

function edit(file, cuts) {
  const p = path.join(out, file);
  let text = fs.readFileSync(p, 'utf8');
  for (const [cut, by] of cuts) {
    if (!cut.test(text)) throw new Error(`${file}: não encontrei ${cut}`);
    text = text.replace(cut, by);
  }
  fs.writeFileSync(p, text);
}

edit('skills/build/SKILL.md', [
  [/^(- \*\*If the skill does not load\*\*)/m,
    '- **Screens people work in** (mode `operate`: an app, a dashboard, a tool): read [app-craft.md](app-craft.md). Decide where motion goes with its two gates, write its tokens and the moments you chose into `DESIGN.md` under "Motion and feedback", and copy its acceptance criteria into `spec.md`. They are part of the scope, like any other criterion.\n$1'],
  [/(1\. \*\*Short spec:\*\* write only `spec\.md` with the goal, testable acceptance criteria and the single task \(tier `haiku` or `sonnet`\)\.)/,
    '$1 If the task builds or changes a screen people work in, the acceptance criteria of [app-craft.md](app-craft.md) that apply are part of the spec.'],
]);
edit('agents/implementer.md', [
  [/^(- Cover every state the user will see:)/m,
    '- The spec\'s interface criteria (press feedback, state changes, reduced motion, the phone baseline, data limits) are scope. Rule 2 and any instruction to write less code decide how you build them, never whether.\n$1'],
]);
edit('agents/reviewer.md', [
  [/^(   - Confirm that the UI follows `DESIGN\.md`:)/m,
    '   - On a screen people work in, check the spec\'s interface criteria on the running app: press a control, trigger a state change, tab through the controls, and look at 390 and at 320 wide. A failed criterion is **important**; content hidden or an action out of reach is a **blocker**.\n$1'],
]);
console.log(`plugin com as regras de ecrãs de aplicação em ${out}`);
