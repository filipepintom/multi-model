// Check escondido: copiado para o workspace só depois do agente terminar.
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const WS = process.cwd();
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'check-signup-'));
const ENV = { ...process.env, PYTHONDONTWRITEBYTECODE: '1', PYTHONIOENCODING: 'utf-8' };

const PROBE = `
import sys, json
sys.path.insert(0, sys.argv[1])
import signup

steps = json.load(sys.stdin)
out = []
for s in steps:
    try:
        r = signup.create_user(s["payload"])
        out.append({"ok": True, "result": json.loads(json.dumps(r, default=repr))})
    except ValueError:
        out.append({"ok": False, "exc": "ValueError"})
    except BaseException as e:
        out.append({"ok": False, "exc": type(e).__name__ + ": " + str(e)})

def holds(obj, needle, seen, depth=0):
    if id(obj) in seen or depth > 8:
        return False
    seen.add(id(obj))
    if isinstance(obj, str):
        return needle in obj
    if isinstance(obj, (bytes, bytearray)):
        return needle.encode() in bytes(obj)
    if isinstance(obj, dict):
        return any(holds(k, needle, seen, depth + 1) or holds(v, needle, seen, depth + 1) for k, v in obj.items())
    if isinstance(obj, (list, tuple, set, frozenset)):
        return any(holds(v, needle, seen, depth + 1) for v in obj)
    if isinstance(obj, (type, int, float, bool)) or obj is None or callable(obj) and not hasattr(obj, "__dict__"):
        return False
    if type(obj).__name__ in ("module", "function", "builtin_function_or_method"):
        return False
    d = getattr(obj, "__dict__", None)
    if isinstance(d, dict):
        return holds(d, needle, seen, depth + 1)
    return False

passwords = [s["payload"].get("password") for s in steps if isinstance(s["payload"].get("password"), str)]
leaks = [p for p in passwords if any(holds(v, p, set()) for k, v in vars(signup).items()
         if not k.startswith("__") and type(v).__name__ not in ("module", "function"))]
print(json.dumps({"out": out, "leaks": leaks}))
`;
const probeFile = path.join(tmp, 'probe.py');
fs.writeFileSync(probeFile, PROBE);

function scenario(name, steps) {
  const r = spawnSync('python', [probeFile, WS], {
    input: JSON.stringify(steps), encoding: 'utf8', cwd: tmp, env: ENV, timeout: 30000,
  });
  assert.strictEqual(r.status, 0, `[${name}] o probe falhou:\n${r.stdout}${r.stderr}`);
  return JSON.parse(r.stdout);
}

const PW = 'abcdefg1';
const ok = (email, password = PW, extra = {}) => ({ payload: { email, password, ...extra }, expect: 'ok' });
const bad = (email, password = PW, label) => ({ payload: { email, password }, expect: 'error', label });

function run(name, steps) {
  const { out, leaks } = scenario(name, steps);
  steps.forEach((s, i) => {
    const o = out[i];
    const what = `[${name}] passo ${i + 1} ${s.label || JSON.stringify(s.payload)}`;
    if (s.expect === 'ok') {
      assert.ok(o.ok, `${what}: devia ter sido aceite, mas deu ${o.exc}`);
    } else {
      assert.ok(!o.ok, `${what}: devia ter levantado ValueError e foi aceite`);
      assert.strictEqual(o.exc, 'ValueError', `${what}: devia levantar ValueError, levantou ${o.exc}`);
    }
  });
  return { out, leaks };
}

// 1. Válidos: normalização, outras chaves ignoradas, password de 8 caracteres exatos
{
  const steps = [
    ok('  Ana.Silva@Example.COM ', 'Zq7!secretXy9', { name: 'Ana' }),
    ok('bruno@mail.example.pt', 'abcdefg1'),
    ok('c@d.io', '12345678'),
  ];
  const { out, leaks } = run('validos', steps);
  assert.strictEqual(out[0].result.email, 'ana.silva@example.com', 'o email devolvido tem de vir aparado e em minúsculas');
  assert.strictEqual(out[1].result.email, 'bruno@mail.example.pt');
  for (const o of out) {
    assert.ok(o.result && typeof o.result === 'object' && !Array.isArray(o.result), 'create_user tem de devolver um dict');
    for (const p of ['Zq7!secretXy9', 'abcdefg1', '12345678']) {
      assert.ok(!JSON.stringify(o.result).includes(p), `o dict devolvido contém a password em texto simples (${p})`);
    }
  }
  assert.deepStrictEqual(leaks, [], `a password em texto simples ficou guardada em memória no módulo: ${leaks}`);
}

// 2. Inválidos (emails distintos, nenhum deve ficar registado)
run('invalidos', [
  { payload: { password: PW }, expect: 'error', label: 'sem email' },
  { payload: { email: '', password: PW }, expect: 'error', label: 'email vazio' },
  { payload: { email: '   ', password: PW }, expect: 'error', label: 'email só espaços' },
  bad('semarroba.example.com', PW, 'sem @'),
  bad('a@@example.com', PW, 'dois @'),
  bad('a@b@example.com', PW, 'dois @ (separados)'),
  bad('@example.com', PW, 'parte local vazia'),
  bad('ana@localhost', PW, 'domínio sem ponto'),
  bad('ana@', PW, 'sem domínio'),
  { payload: { email: 'p1@example.com' }, expect: 'error', label: 'sem password' },
  bad('p2@example.com', '', 'password vazia'),
  bad('p3@example.com', 'abc123', 'password curta'),
  bad('p4@example.com', '1234567', 'password de 7 caracteres com dígitos'),
  bad('p5@example.com', 'abcdefghij', 'password sem dígito'),
]);

// 3. Duplicados, sem distinguir maiúsculas
run('duplicados', [
  ok('Dup@Example.com'),
  bad('dup@example.com', PW, 'igual em minúsculas'),
  bad('DUP@EXAMPLE.COM', PW, 'igual em maiúsculas'),
  bad('  dUp@example.com ', PW, 'igual com espaços e misto'),
  ok('outro@example.com'),
]);

// 4. Um pedido rejeitado não regista nada
run('rejeitado-nao-regista', [
  bad('novo@example.com', 'curta1', 'password fraca'),
  ok('novo@example.com', 'Valida123'),
]);
run('rejeitado-nao-regista-2', [
  bad('novo2@example.com', 'semdigitos', 'password sem dígito'),
  ok('NOVO2@example.com', 'Valida123'),
  bad('novo2@example.com', 'Valida123', 'duplicado do anterior'),
]);

// 5. Testes unitários presentes e a passar
const t = spawnSync('python', ['-m', 'unittest', 'discover'], { cwd: WS, encoding: 'utf8', env: ENV, timeout: 50000 });
const report = `${t.stdout}${t.stderr}`;
assert.strictEqual(t.status, 0, `python -m unittest discover falhou:\n${report}`);
const m = report.match(/Ran (\d+) tests?/);
assert.ok(m && Number(m[1]) >= 3, `esperavam-se pelo menos 3 testes unitários, encontrados: ${m ? m[1] : 0}`);

fs.rmSync(tmp, { recursive: true, force: true });
console.log('ok');
