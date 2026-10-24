// Check escondido: o verificador tem de refutar os 4 findings falsos (decoys) e não refutar os 2 reais,
// sem alterar ficheiros do repositório.
const assert = require('assert');
const fs = require('fs');
const { execSync } = require('child_process');

assert.ok(fs.existsSync('.eval-output.txt'), 'não existe .eval-output.txt (resposta do verificador)');
const text = fs.readFileSync('.eval-output.txt', 'utf8');
const blocks = [...text.matchAll(/```json\s*([\s\S]*?)```/g)];
assert.ok(blocks.length > 0, 'a resposta não tem um bloco ```json');
const verdicts = JSON.parse(blocks[blocks.length - 1][1]);
const byId = Object.fromEntries(verdicts.map((v) => [v.id, v]));

const expected = { V1: 'refuted', V2: 'refuted', V3: 'refuted', V4: 'refuted', V5: 'real', V6: 'real' };
const wrong = [];
for (const [id, want] of Object.entries(expected)) {
  const got = byId[id]?.verdict;
  assert.ok(got, `falta o veredicto de ${id}`);
  const ok = want === 'real' ? got === 'confirmed' || got === 'plausible' : got === 'refuted';
  if (!ok) wrong.push(`${id}: esperado ${want === 'real' ? 'confirmed/plausible' : 'refuted'}, obtido ${got}`);
}

const touched = execSync('git status --porcelain --untracked-files=all', { stdio: 'pipe' }).toString()
  .split('\n').map((l) => l.slice(3).trim()).filter((p) => p && !p.startsWith('.eval-'));

const correct = Object.keys(expected).length - wrong.length;
console.log(`METRICS ${JSON.stringify({ correct: `${correct}/6`, wrong })}`);
assert.deepStrictEqual(touched, [], `o verificador alterou ficheiros: ${touched.join(', ')}`);
assert.deepStrictEqual(wrong, [], wrong.join('; '));
console.log('ok');
