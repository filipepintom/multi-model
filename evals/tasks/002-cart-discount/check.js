// Check escondido: copiado para o workspace só depois do agente terminar.
const assert = require('assert');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const { total } = require(path.resolve('cart.js'));

assert.strictEqual(total([{ price: 10, qty: 2 }, { price: 5, qty: 1 }], 10), 22.5, 'desconto de 10%');
assert.strictEqual(total([{ price: 19.99, qty: 3 }], 0), 59.97, 'sem desconto, arredondado');
assert.strictEqual(total([{ price: 80, qty: 1 }], 100), 0, 'desconto de 100%');
assert.strictEqual(total([], 50), 0, 'carrinho vazio');
assert.strictEqual(total([{ price: 10, qty: 1 }]), 10, 'desconto por omissão');

const testFiles = findTestFiles('.');
const mentionsDiscount = testFiles.some((f) => /total\([^)]*,\s*\d+/.test(fs.readFileSync(f, 'utf8')));
assert.ok(mentionsDiscount, 'nenhum teste chama total() com desconto');

execSync('npm test', { stdio: 'inherit' });
console.log('ok');

// Procura ficheiros de teste em todo o projeto (não só na raiz): pastas como test/ são legítimas.
function findTestFiles(dir) {
  const fs = require('fs');
  const path = require('path');
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.git', '.claude', 'docs'].includes(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...findTestFiles(p));
    else if (/\.test\.js$/.test(e.name) || /^test.*\.js$/.test(e.name)) out.push(p);
  }
  return out;
}
