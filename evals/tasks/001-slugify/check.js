// Check escondido: copiado para o workspace só depois do agente terminar.
const assert = require('assert');
const path = require('path');

const { slugify } = (() => {
  const mod = require(path.resolve('slugify.js'));
  return typeof mod === 'function' ? { slugify: mod } : mod;
})();

const cases = [
  ['Olá Mundo!', 'ola-mundo'],
  ['  Ação -- Rápida  ', 'acao-rapida'],
  ['São João 2026', 'sao-joao-2026'],
  ['already-a-slug', 'already-a-slug'],
  ['Crème Brûlée & Café', 'creme-brulee-cafe'],
  ['---', ''],
  ['', ''],
];

for (const [input, expected] of cases) {
  assert.strictEqual(slugify(input), expected, `slugify(${JSON.stringify(input)})`);
}

const { execSync } = require('child_process');
execSync('npm test', { stdio: 'inherit' });
console.log('ok');
