// Check escondido: copiado para o workspace só depois do agente terminar.
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const WS = process.cwd();
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'check-migrate-'));
const ENV = { ...process.env, PYTHONDONTWRITEBYTECODE: '1', PYTHONIOENCODING: 'utf-8' };

assert.ok(fs.existsSync(path.join(WS, 'migrate.py')), 'migrate.py desapareceu');
assert.ok(
  fs.readdirSync(path.join(WS, 'migrations')).some((f) => /^002_.+\.py$/.test(f)),
  'não existe nenhum ficheiro migrations/002_*.py',
);

// Probe: acede à base de dados com sqlite3 (nunca com o código do projeto).
const PROBE = `
import json, sqlite3, sys

mode, db = sys.argv[1], sys.argv[2]
conn = sqlite3.connect(db)
conn.row_factory = sqlite3.Row

if mode == "seed":
    rows = json.loads(sys.argv[3])
    conn.executemany("INSERT INTO users (first_name, last_name, email) VALUES (?, ?, ?)", rows)
    conn.commit()
    print(json.dumps({"ok": True}))
elif mode == "insert":
    first, last, email = sys.argv[3:6]
    try:
        conn.execute("INSERT INTO users (first_name, last_name, email) VALUES (?, ?, ?)", (first, last, email))
        conn.commit()
        print(json.dumps({"ok": True}))
    except sqlite3.IntegrityError as e:
        print(json.dumps({"ok": False, "error": "IntegrityError", "msg": str(e)}))
    except sqlite3.Error as e:
        print(json.dumps({"ok": False, "error": type(e).__name__, "msg": str(e)}))
elif mode == "dump":
    cols = [r["name"] for r in conn.execute("PRAGMA table_info(users)")]
    users = [dict(r) for r in conn.execute("SELECT * FROM users ORDER BY email")]
    versions = [list(r) for r in conn.execute("SELECT * FROM schema_version ORDER BY 1")]
    maxv = conn.execute("SELECT MAX(version) FROM schema_version").fetchone()[0]
    objects = [list(r) for r in conn.execute("SELECT type, name, sql FROM sqlite_master ORDER BY type, name")]
    print(json.dumps({"cols": cols, "users": users, "versions": versions, "max_version": maxv, "objects": objects}))
`;
const probeFile = path.join(tmp, 'probe.py');
fs.writeFileSync(probeFile, PROBE);

function probe(mode, db, ...rest) {
  const r = spawnSync('python', [probeFile, mode, db, ...rest], { encoding: 'utf8', env: ENV, timeout: 30000 });
  assert.strictEqual(r.status, 0, `probe ${mode} falhou:\n${r.stdout}${r.stderr}`);
  return JSON.parse(r.stdout);
}

function migrate(db, ...extra) {
  return spawnSync('python', ['migrate.py', db, ...extra], { cwd: WS, encoding: 'utf8', env: ENV, timeout: 30000 });
}

function migrateOk(db, ...extra) {
  const r = migrate(db, ...extra);
  assert.strictEqual(r.status, 0, `python migrate.py ${extra.join(' ')} terminou com código ${r.status}\n${r.stdout}${r.stderr}`);
  return r;
}

const byEmail = (dump) => Object.fromEntries(dump.users.map((u) => [u.email, u]));

// ---- Cenário 1: base com dados na versão 1, depois migrar ----
const db1 = path.join(tmp, 'um.db');
migrateOk(db1, '--to', '1');
let d = probe('dump', db1);
assert.strictEqual(d.max_version, 1, '--to 1 devia deixar a versão em 1');
assert.ok(!d.cols.includes('full_name'), 'a coluna full_name não devia existir com --to 1');

const seed = [
  ['Ana', 'Silva', 'ana@example.com'],
  ['Bruno', '', 'bruno@example.com'],
  ['', 'Costa', 'costa@example.com'],
  [' Dora', 'Reis ', 'dora@example.com'],
  ['João', 'Ferreira', 'Joao@Example.com'],
];
probe('seed', db1, JSON.stringify(seed));

migrateOk(db1);
d = probe('dump', db1);
assert.strictEqual(d.max_version, 2, `depois de migrar a versão devia ser 2, é ${d.max_version}`);
assert.ok(d.cols.includes('full_name'), 'a tabela users não tem a coluna full_name');
assert.strictEqual(d.users.length, seed.length, 'a migração não devia perder nem duplicar utilizadores');
const u = byEmail(d);
const expectedFull = {
  'ana@example.com': 'Ana Silva',
  'bruno@example.com': 'Bruno',
  'costa@example.com': 'Costa',
  'dora@example.com': 'Dora Reis',
  'Joao@Example.com': 'João Ferreira',
};
for (const [email, full] of Object.entries(expectedFull)) {
  assert.ok(u[email], `o utilizador ${email} desapareceu depois da migração`);
  assert.strictEqual(u[email].full_name, full, `full_name de ${email}: esperado ${JSON.stringify(full)}, obtido ${JSON.stringify(u[email].full_name)}`);
  assert.ok(u[email].first_name !== undefined && u[email].last_name !== undefined, 'first_name/last_name têm de continuar a existir');
}
assert.strictEqual(u['dora@example.com'].first_name.trim(), 'Dora', 'os dados originais não deviam ser perdidos');

// Unicidade sem distinguir maiúsculas, apenas para novos registos
for (const email of ['ana@example.com', 'ANA@example.com', 'Ana@Example.COM', 'joao@example.com', 'JOAO@EXAMPLE.COM']) {
  const r = probe('insert', db1, 'Outro', 'Nome', email);
  assert.strictEqual(r.ok, false, `inserir ${email} devia falhar (já existe um email igual sem distinguir maiúsculas)`);
  assert.strictEqual(r.error, 'IntegrityError', `inserir ${email} devia falhar com sqlite3.IntegrityError, falhou com ${r.error}: ${r.msg}`);
}
// Inserções legítimas (só com first_name, last_name, email) continuam a funcionar
for (const email of ['novo@example.com', 'ana.silva@example.com']) {
  const r = probe('insert', db1, 'Novo', 'Utilizador', email);
  assert.strictEqual(r.ok, true, `inserir ${email} (email novo) devia funcionar: ${r.error} ${r.msg}`);
}
d = probe('dump', db1);
assert.strictEqual(d.users.length, seed.length + 2, 'as inserções falhadas não deviam ter deixado registos');
const afterInserts = d;

// ---- Segunda execução: no-op ----
const again = migrate(db1);
assert.strictEqual(again.status, 0, `a segunda execução de migrate.py falhou (código ${again.status})\n${again.stdout}${again.stderr}`);
d = probe('dump', db1);
assert.strictEqual(d.max_version, 2, 'a segunda execução alterou a versão');
assert.deepStrictEqual(d, afterInserts, 'a segunda execução alterou a base de dados (utilizadores, schema_version ou esquema)');
const third = migrate(db1);
assert.strictEqual(third.status, 0, 'a terceira execução de migrate.py falhou');

// ---- Cenário 2: base nova, migrar tudo de uma vez ----
const db2 = path.join(tmp, 'dois.db');
migrateOk(db2);
d = probe('dump', db2);
assert.strictEqual(d.max_version, 2, 'numa base nova a versão final devia ser 2');
assert.ok(d.cols.includes('full_name'));
assert.strictEqual(probe('insert', db2, 'A', 'B', 'x@y.pt').ok, true);
const dup = probe('insert', db2, 'C', 'D', 'X@Y.PT');
assert.strictEqual(dup.ok, false, 'numa base nova, X@Y.PT devia colidir com x@y.pt');
assert.strictEqual(dup.error, 'IntegrityError');

// ---- Cenário 3: --to 2 explícito, e repetir --to 1 depois de estar na 2 não faz nada ----
const db3 = path.join(tmp, 'tres.db');
migrateOk(db3, '--to', '2');
assert.strictEqual(probe('dump', db3).max_version, 2);
migrateOk(db3, '--to', '1');
assert.strictEqual(probe('dump', db3).max_version, 2, '--to 1 numa base já na versão 2 não devia alterar a versão');

fs.rmSync(tmp, { recursive: true, force: true });
console.log('ok');
