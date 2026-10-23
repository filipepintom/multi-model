// Check escondido: copiado para o workspace só depois do agente terminar.
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const WS = process.cwd();
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'check-todo-'));
const BASE_ENV = { ...process.env, PYTHONDONTWRITEBYTECODE: '1', PYTHONIOENCODING: 'utf-8' };
delete BASE_ENV.TODO_FILE;

assert.ok(fs.existsSync(path.join(WS, 'todo.py')), 'todo.py não existe na raiz do projeto');

function cli(file, ...args) {
  const r = spawnSync('python', ['todo.py', ...args], {
    cwd: WS, encoding: 'utf8', env: { ...BASE_ENV, TODO_FILE: file }, timeout: 20000,
  });
  assert.ok(r.status !== null, `python todo.py ${args.join(' ')} não terminou (timeout?)`);
  return { code: r.status, out: r.stdout.replace(/\r\n/g, '\n'), err: r.stderr };
}
const lines = (s) => s.split('\n').map((l) => l.trimEnd()).filter((l) => l !== '');

function expectOk(r, what) {
  assert.strictEqual(r.code, 0, `${what}: esperava-se código 0, veio ${r.code}\n${r.err}`);
}

// 1. Fluxo básico, ficheiro ainda inexistente
const f1 = path.join(tmp, 'um.json');
{
  let r = cli(f1, 'list');
  expectOk(r, 'list com ficheiro inexistente');
  assert.deepStrictEqual(lines(r.out), [], 'list sem tarefas não devia imprimir nada');

  r = cli(f1, 'add', 'comprar leite e pão');
  expectOk(r, 'add');
  assert.strictEqual(r.out.trim(), '1', `add devia imprimir apenas o id (1), imprimiu ${JSON.stringify(r.out)}`);
  assert.ok(fs.existsSync(f1), 'o ficheiro TODO_FILE devia ter sido criado pelo add');
  assert.doesNotThrow(() => JSON.parse(fs.readFileSync(f1, 'utf8')), 'TODO_FILE devia conter JSON válido');

  r = cli(f1, 'add', 'ligar ao banco');
  expectOk(r, 'add 2');
  assert.strictEqual(r.out.trim(), '2');
  r = cli(f1, 'add', 'enviar relatório');
  assert.strictEqual(r.out.trim(), '3');

  r = cli(f1, 'list');
  expectOk(r, 'list');
  assert.deepStrictEqual(lines(r.out), ['1 [ ] comprar leite e pão', '2 [ ] ligar ao banco', '3 [ ] enviar relatório']);

  expectOk(cli(f1, 'done', '2'), 'done 2');
  r = cli(f1, 'list');
  assert.deepStrictEqual(lines(r.out), ['1 [ ] comprar leite e pão', '2 [x] ligar ao banco', '3 [ ] enviar relatório']);

  expectOk(cli(f1, 'remove', '1'), 'remove 1');
  r = cli(f1, 'list');
  assert.deepStrictEqual(lines(r.out), ['2 [x] ligar ao banco', '3 [ ] enviar relatório']);
}

// 2. Ids nunca reutilizados (apagar o último, apagar tudo)
{
  let r = cli(f1, 'remove', '3');
  expectOk(r, 'remove 3');
  r = cli(f1, 'add', 'nova');
  assert.strictEqual(r.out.trim(), '4', `o id 3 foi reutilizado ou o contador falhou: add imprimiu ${JSON.stringify(r.out)}`);
  expectOk(cli(f1, 'remove', '2'), 'remove 2');
  expectOk(cli(f1, 'remove', '4'), 'remove 4');
  assert.deepStrictEqual(lines(cli(f1, 'list').out), [], 'a lista devia estar vazia');
  r = cli(f1, 'add', 'depois de esvaziar');
  assert.strictEqual(r.out.trim(), '5', 'com a lista vazia o id seguinte devia continuar (5), não recomeçar');
  assert.deepStrictEqual(lines(cli(f1, 'list').out), ['5 [ ] depois de esvaziar']);
}

// 3. Ordenação numérica por id (mais de 9 tarefas)
const f2 = path.join(tmp, 'dois.json');
{
  for (let i = 1; i <= 12; i++) {
    const r = cli(f2, 'add', `tarefa ${i}`);
    assert.strictEqual(r.out.trim(), String(i));
  }
  expectOk(cli(f2, 'remove', '3'), 'remove 3');
  expectOk(cli(f2, 'done', '10'), 'done 10');
  const expected = [];
  for (let i = 1; i <= 12; i++) if (i !== 3) expected.push(`${i} [${i === 10 ? 'x' : ' '}] tarefa ${i}`);
  assert.deepStrictEqual(lines(cli(f2, 'list').out), expected, 'list tem de ordenar numericamente por id');
}

// 4. Ficheiros diferentes são independentes
{
  const f3 = path.join(tmp, 'tres.json');
  assert.strictEqual(cli(f3, 'add', 'isolada').out.trim(), '1');
  assert.deepStrictEqual(lines(cli(f3, 'list').out), ['1 [ ] isolada']);
}

// 5. Id inexistente: stderr + código 1, sem alterar nada
{
  const before = lines(cli(f2, 'list').out);
  for (const args of [['done', '99'], ['remove', '99'], ['done', '3'], ['remove', '3']]) {
    const r = cli(f2, ...args);
    assert.strictEqual(r.code, 1, `todo.py ${args.join(' ')} devia terminar com código 1, terminou com ${r.code}`);
    assert.ok(r.err.trim().length > 0, `todo.py ${args.join(' ')} devia escrever uma mensagem no stderr`);
  }
  assert.deepStrictEqual(lines(cli(f2, 'list').out), before, 'uma operação falhada não devia alterar a lista');
  const empty = path.join(tmp, 'vazio.json');
  assert.strictEqual(cli(empty, 'done', '1').code, 1, 'done 1 num ficheiro inexistente devia dar código 1');
}

// 6. Uso inválido: código 2
for (const args of [[], ['frobnicate'], ['add'], ['done'], ['remove'], ['done', 'abc'], ['remove', 'x1'], ['done', '1.5']]) {
  const r = cli(f2, ...args);
  assert.strictEqual(r.code, 2, `todo.py ${args.join(' ') || '(sem argumentos)'} devia terminar com código 2, terminou com ${r.code}`);
}

// 7. Testes unitários presentes e a passar
const t = spawnSync('python', ['-m', 'unittest', 'discover'], { cwd: WS, encoding: 'utf8', env: BASE_ENV, timeout: 50000 });
const report = `${t.stdout}${t.stderr}`;
assert.strictEqual(t.status, 0, `python -m unittest discover falhou:\n${report}`);
const m = report.match(/Ran (\d+) tests?/);
assert.ok(m && Number(m[1]) >= 3, `esperavam-se pelo menos 3 testes unitários, encontrados: ${m ? m[1] : 0}`);

fs.rmSync(tmp, { recursive: true, force: true });
console.log('ok');
