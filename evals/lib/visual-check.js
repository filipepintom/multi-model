// Check comum dos evals visuais. Não mede design: isso é com o júri (evals/visual/jury.js). Só garante que a página
// existe e traz o conteúdo pedido, para que nenhum lado ganhe por ter cortado a parte difícil.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const TEXT = /\.(html?|css|js|mjs|json)$/i;
const SKIP = /^(node_modules|\.git|docs|\.studio|\.claude)$|^\.eval-/;

function pageText(dir = '.') {
  return fs.readdirSync(dir, { withFileTypes: true }).filter((e) => !SKIP.test(e.name)).map((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return pageText(p);
    return TEXT.test(e.name) ? fs.readFileSync(p, 'utf8') : '';
  }).join('\n');
}

module.exports = function visualCheck({ facts, original }) {
  assert.ok(fs.existsSync('index.html'), 'não existe index.html na raiz');
  const text = pageText();
  const missing = facts.filter((f) => !text.includes(f));
  // SHA-256 do fixture: comparar com o git não serve, porque o dry-run faz commit da referência logo de início.
  if (original) {
    const hash = crypto.createHash('sha256').update(fs.readFileSync('index.html')).digest('hex');
    assert.notStrictEqual(hash, original, 'o index.html ficou igual ao original');
  }
  console.log(`METRICS ${JSON.stringify({ factos: `${facts.length - missing.length}/${facts.length}`, em_falta: missing })}`);
  assert.deepStrictEqual(missing, [], `conteúdo em falta: ${missing.join(', ')}`);
  console.log('ok');
};
