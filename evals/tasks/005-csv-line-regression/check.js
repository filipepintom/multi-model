// Check escondido: copiado para o workspace só depois do agente terminar.
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const { parseLine } = require(path.resolve('csv.js'));

const cases = [
  ['', ['']],
  ['a', ['a']],
  ['a,b,c', ['a', 'b', 'c']],
  ['a, b ,c', ['a', ' b ', 'c']],
  [',', ['', '']],
  [',,', ['', '', '']],
  [',a', ['', 'a']],
  ['a,', ['a', '']],
  [',a,', ['', 'a', '']],
  ['a,,b', ['a', '', 'b']],
  ['"a"', ['a']],
  ['"a","b"', ['a', 'b']],
  ['a,"b,c",d', ['a', 'b,c', 'd']],
  ['"a,b"', ['a,b']],
  ['"a,b","c,d"', ['a,b', 'c,d']],
  ['"a,,b"', ['a,,b']],
  ['""', ['']],
  ['"",x', ['', 'x']],
  ['x,""', ['x', '']],
  ['x,"",y', ['x', '', 'y']],
  ['"ele disse ""olá""",x', ['ele disse "olá"', 'x']],
  ['"""",x', ['"', 'x']],
  ['"a""b"', ['a"b']],
  ['"a""",b', ['a"', 'b']],
  ['"""a",b', ['"a', 'b']],
  ['"a "" , b",c', ['a " , b', 'c']],
  ['1,"Silva, João",3.5,"Rua ""A"", n.º 2"', ['1', 'Silva, João', '3.5', 'Rua "A", n.º 2']],
  ['"a",,"c"', ['a', '', 'c']],
  ['x,"a b",y', ['x', 'a b', 'y']],
  ['ação,naïve,日本', ['ação', 'naïve', '日本']],
];

for (const [input, expected] of cases) {
  let got;
  try {
    got = parseLine(input);
  } catch (e) {
    assert.fail(`parseLine(${JSON.stringify(input)}) lançou: ${e.message}`);
  }
  assert.ok(Array.isArray(got), `parseLine(${JSON.stringify(input)}) devia devolver um array`);
  assert.deepStrictEqual(got, expected, `parseLine(${JSON.stringify(input)})`);
}

// linha longa sem aspas continua correta
const wide = Array.from({ length: 2000 }, (_, i) => `campo${i}`);
assert.deepStrictEqual(parseLine(wide.join(',')), wide, 'linha longa sem aspas');

// testes: têm de existir e passar
const skip = new Set(['.git', 'node_modules', '.eval-check.js']);
const testFiles = fs.readdirSync('.').filter((f) => /\.test\.js$/.test(f) || /^test.*\.js$/.test(f));
assert.ok(testFiles.length > 0, 'não existem ficheiros de teste');
const t = spawnSync('npm test', { shell: true, encoding: 'utf8', timeout: 50000 });
assert.strictEqual(t.status, 0, `npm test falhou:\n${t.stdout}\n${t.stderr}`);

// os testes têm de apanhar a regressão: com o parser antigo (split) têm de falhar
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'csv-mut-'));
try {
  fs.cpSync('.', tmp, { recursive: true, filter: (src) => !skip.has(path.basename(src)) });
  fs.writeFileSync(path.join(tmp, 'csv.js'), "function parseLine(line) { return line.split(','); }\nmodule.exports = { parseLine };\n");
  const m = spawnSync('npm test', { shell: true, cwd: tmp, encoding: 'utf8', timeout: 50000 });
  assert.notStrictEqual(m.status, 0, 'os testes passam mesmo com o parser antigo (line.split): não apanham a regressão');
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
console.log('ok');
