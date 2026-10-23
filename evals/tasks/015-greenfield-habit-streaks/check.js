// Check escondido: copiado para o workspace só depois do agente terminar.
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const WS = process.cwd();
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'check-habits-'));
const ENV = { ...process.env, PYTHONDONTWRITEBYTECODE: '1', PYTHONIOENCODING: 'utf-8' };

assert.ok(fs.existsSync(path.join(WS, 'habits.py')), 'habits.py não existe na raiz do projeto');

// ---- Auxiliares de datas e de baralhar (determinístico) ----
const iso = (d) => d.toISOString().slice(0, 10);
function range(start, n) {
  const out = [];
  const d = new Date(`${start}T00:00:00Z`);
  for (let i = 0; i < n; i++) { out.push(iso(d)); d.setUTCDate(d.getUTCDate() + 1); }
  return out;
}
function shuffled(arr) {
  const a = [...arr];
  let seed = 12345;
  for (let i = a.length - 1; i > 0; i--) {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    const j = seed % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---- Casos: [nome, check_ins, today, current_streak esperado, longest_streak esperado] ----
const cases = [
  ['vazio', [], '2024-05-10', 0, 0],
  ['só hoje', ['2024-05-10'], '2024-05-10', 1, 1],
  ['só ontem', ['2024-05-09'], '2024-05-10', 1, 1],
  ['só anteontem', ['2024-05-08'], '2024-05-10', 0, 1],
  ['termina hoje', range('2024-05-06', 5), '2024-05-10', 5, 5],
  ['termina ontem (hoje ainda sem registo)', range('2024-05-06', 5), '2024-05-11', 5, 5],
  ['terminou há dois dias', range('2024-05-06', 5), '2024-05-12', 0, 5],
  ['terminou há muito tempo', range('2024-01-06', 5), '2024-05-12', 0, 5],
  ['repetidos', ['2024-05-09', '2024-05-09', '2024-05-10', '2024-05-10', '2024-05-10'], '2024-05-10', 2, 2],
  ['só repetidos do mesmo dia', ['2024-05-10', '2024-05-10', '2024-05-10'], '2024-05-10', 1, 1],
  ['desordenado', ['2024-05-10', '2024-05-08', '2024-05-09', '2024-05-06', '2024-05-07'], '2024-05-10', 5, 5],
  ['desordenado com repetidos e falha', ['2024-05-06', '2024-05-02', '2024-05-05', '2024-05-02', '2024-05-01', '2024-05-04', '2024-05-06'], '2024-05-06', 3, 3],
  ['falha a meio, termina hoje', ['2024-05-01', '2024-05-02', '2024-05-04', '2024-05-05', '2024-05-06'], '2024-05-06', 3, 3],
  ['falha, sequência maior antes', ['2024-05-01', '2024-05-02', '2024-05-03', '2024-05-05'], '2024-05-05', 1, 3],
  ['falha, sequência maior antes, hoje sem registo', ['2024-05-01', '2024-05-02', '2024-05-03', '2024-05-05'], '2024-05-06', 1, 3],
  ['falha, sequência maior antes, quebrada', ['2024-05-01', '2024-05-02', '2024-05-03', '2024-05-05'], '2024-05-07', 0, 3],
  ['maior sequência no passado', [...range('2024-01-01', 10), '2024-05-09', '2024-05-10'], '2024-05-10', 2, 10],
  ['viragem de mês (ano comum)', ['2023-01-30', '2023-01-31', '2023-02-01'], '2023-02-01', 3, 3],
  ['viragem de mês, termina ontem', ['2023-04-29', '2023-04-30', '2023-05-01'], '2023-05-02', 3, 3],
  ['viragem de ano', ['2023-12-30', '2023-12-31', '2024-01-01'], '2024-01-01', 3, 3],
  ['viragem de ano, termina ontem', ['2023-12-30', '2023-12-31', '2024-01-01'], '2024-01-02', 3, 3],
  ['viragem de ano, quebrada', ['2023-12-30', '2023-12-31', '2024-01-01'], '2024-01-03', 0, 3],
  ['dia bissexto presente', ['2024-02-28', '2024-02-29', '2024-03-01'], '2024-03-01', 3, 3],
  ['dia bissexto em falta', ['2024-02-28', '2024-03-01'], '2024-03-01', 1, 1],
  ['termina no dia bissexto', ['2024-02-27', '2024-02-28', '2024-02-29'], '2024-02-29', 3, 3],
  ['termina no dia bissexto, hoje é o dia seguinte', ['2024-02-28', '2024-02-29'], '2024-03-01', 2, 2],
  ['fevereiro de ano comum (28 -> 1 de março)', ['2023-02-28', '2023-03-01'], '2023-03-01', 2, 2],
  ['2100 não é bissexto', ['2100-02-28', '2100-03-01'], '2100-03-01', 2, 2],
  ['2000 é bissexto', ['2000-02-28', '2000-02-29', '2000-03-01'], '2000-03-01', 3, 3],
  ['sequência longa (atravessa 29 de fevereiro de 2020)', range('2020-01-01', 1500), range('2020-01-01', 1500).at(-1), 1500, 1500],
  ['sequência longa desordenada com repetidos, hoje sem registo', shuffled([...range('2020-01-01', 1500), ...range('2020-03-01', 50)]), iso(new Date(Date.UTC(2020, 0, 1 + 1500))), 1500, 1500],
  ['sequência longa quebrada', range('2020-01-01', 1500), iso(new Date(Date.UTC(2020, 0, 1 + 1501))), 0, 1500],
];

const PROBE = `
import json, sys
sys.path.insert(0, sys.argv[1])
import habits
cases = json.load(open(sys.argv[2], encoding="utf-8"))
out = []
for name, check_ins, today in cases:
    row = {"name": name}
    for fn, args in (("current_streak", (list(check_ins), today)), ("longest_streak", (list(check_ins),))):
        try:
            v = getattr(habits, fn)(*args)
            row[fn] = v if (isinstance(v, int) and not isinstance(v, bool)) else {"bad_type": type(v).__name__, "repr": repr(v)}
        except BaseException as e:
            row[fn] = {"error": type(e).__name__ + ": " + str(e)}
    out.append(row)
print("@@RESULT@@" + json.dumps(out))
`;
fs.writeFileSync(path.join(tmp, 'probe.py'), PROBE);
fs.writeFileSync(path.join(tmp, 'cases.json'), JSON.stringify(cases.map(([n, c, t]) => [n, c, t])));

const r = spawnSync('python', [path.join(tmp, 'probe.py'), WS, path.join(tmp, 'cases.json')], {
  cwd: tmp, encoding: 'utf8', env: ENV, timeout: 40000, input: '',
});
assert.strictEqual(r.status, 0, `o probe falhou (o módulo importa-se? tem as duas funções?):\n${r.stdout}${r.stderr}`);
const marker = r.stdout.indexOf('@@RESULT@@');
assert.ok(marker >= 0, `o probe não devolveu resultados:\n${r.stdout}${r.stderr}`);
assert.strictEqual(r.stdout.slice(0, marker).trim(), '', 'importar habits não devia imprimir nada');
const results = JSON.parse(r.stdout.slice(marker + '@@RESULT@@'.length));

const failures = [];
cases.forEach(([name, , today, cur, longest], i) => {
  const got = results[i];
  if (got.current_streak !== cur) failures.push(`current_streak [${name}] (today=${today}): esperado ${cur}, obtido ${JSON.stringify(got.current_streak)}`);
  if (got.longest_streak !== longest) failures.push(`longest_streak [${name}]: esperado ${longest}, obtido ${JSON.stringify(got.longest_streak)}`);
});
assert.strictEqual(failures.length, 0, `${failures.length} falha(s):\n  ${failures.join('\n  ')}`);

fs.rmSync(tmp, { recursive: true, force: true });
console.log('ok');
