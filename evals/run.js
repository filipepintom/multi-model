#!/usr/bin/env node
// Corre as tarefas de referência contra a cópia de trabalho do plugin studio e regista resultados.
//
//   node evals/run.js                       todas as tarefas
//   node evals/run.js --task 001-slugify    uma tarefa (ou várias, separadas por vírgulas)
//   node evals/run.js --label "ponytail"    etiqueta a execução (para comparar variantes)
//   node evals/run.js --model sonnet        modelo do orquestrador (por omissão: opus)
//   node evals/run.js --dry-run             valida os checks: falham no fixture e passam com reference/ aplicada
//   node evals/run.js --extra-plugin <dir>  carrega plugins extra (para A/B de skills de terceiros, sem os instalar)
//   node evals/run.js --stats <workspace>   calcula as linhas de código/testes e dependências de um workspace
//   node evals/run.js --settings <ficheiro> settings extra para a sessão (ex.: evals/ab/sem-ponytail.json)
//
// Cada tarefa: task.md (pedido), check.js (escondido), reference/ (solução de referência, só para validar),
// fixture/ (código inicial, opcional), fixture-from (id de outra tarefa cujo fixture reutilizar, opcional),
// command (comando do estúdio, opcional; por omissão /studio:build; `agent:<nome>` corre um agente diretamente com
// task.md como prompt), flags (flags extra, opcional; por omissão --skip-idea no build e nada nos outros comandos).
// A resposta final do agente fica em .eval-output.txt no workspace, para o check a poder ler.
//
// Os checks podem usar as bibliotecas de evals/lib via process.env.EVAL_LIB e reportar métricas com uma
// linha `METRICS {...}` no stdout, que fica na coluna "metricas" do results.csv.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync, execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const TASKS_DIR = path.join(__dirname, 'tasks');
const LIB_DIR = path.join(__dirname, 'lib');
const RESULTS = path.join(__dirname, 'results.csv');
const HEADER = ['data', 'versao_studio', 'label', 'modelo', 'tarefa', 'passou', 'custo_usd', 'duracao_s', 'turnos', 'erro', 'workspace', 'metricas'];
const PLUGIN_DIR = path.join(ROOT, 'plugins', 'studio');

const ALLOWED_TOOLS = [
  'Bash(npm *)', 'Bash(npx *)', 'Bash(node *)', 'Bash(git *)',
  'Bash(python *)', 'Bash(pytest *)', 'Bash(ls *)', 'Bash(mkdir *)', 'Bash(cat *)',
  'WebSearch', 'WebFetch',
];

function arg(name) {
  const i = process.argv.indexOf(name);
  return i === -1 ? undefined : process.argv[i + 1];
}
const onlyTasks = arg('--task')?.split(',');
const label = arg('--label') || 'baseline';
const model = arg('--model') || 'opus'; // modelo do orquestrador (sessão principal)
const dryRun = process.argv.includes('--dry-run');
const extraPlugins = (arg('--extra-plugin') || '').split(',').filter(Boolean).map((p) => path.resolve(p));
const settingsFile = arg('--settings'); // settings extra (ex.: desligar um plugin instalado no grupo de controlo de um A/B)
const statsOnly = arg('--stats'); // node evals/run.js --stats <workspace>: só calcula as métricas de dimensão

function studioVersion() {
  try {
    const sha = execSync('git rev-parse --short HEAD', { cwd: ROOT, stdio: 'pipe' }).toString().trim();
    const dirty = execSync('git status --porcelain', { cwd: ROOT, stdio: 'pipe' }).toString().trim();
    return dirty ? `${sha}-dirty` : sha;
  } catch {
    return 'sem-commit';
  }
}

function git(args, cwd) {
  execSync(`git -c user.name=studio-eval -c user.email=eval@localhost ${args}`, { cwd, stdio: 'pipe' });
}

function prepareWorkspace(taskDir, id, withReference = false) {
  // Caminho longo real: nomes 8.3 (EXT_TI~1) são tratados como suspeitos e exigem aprovação manual.
  const tmp = fs.realpathSync.native(os.tmpdir());
  const ws = fs.realpathSync.native(fs.mkdtempSync(path.join(tmp, `studio-eval-${id}-`)));
  const fixtureFrom = path.join(taskDir, 'fixture-from');
  const fixture = fs.existsSync(fixtureFrom)
    ? path.join(TASKS_DIR, fs.readFileSync(fixtureFrom, 'utf8').trim(), 'fixture')
    : path.join(taskDir, 'fixture');
  if (fs.existsSync(fixture)) fs.cpSync(fixture, ws, { recursive: true });
  else fs.writeFileSync(path.join(ws, 'README.md'), `# ${id}\n`);
  if (withReference) fs.cpSync(path.join(taskDir, 'reference'), ws, { recursive: true });
  git('init -q -b main', ws);
  git('add -A', ws);
  git('commit -q -m "fixture"', ws);
  return ws;
}

function runCheck(taskDir, ws) {
  fs.copyFileSync(path.join(taskDir, 'check.js'), path.join(ws, '.eval-check.js'));
  const r = spawnSync('node', ['.eval-check.js'], {
    cwd: ws, encoding: 'utf8', timeout: 3 * 60 * 1000, env: { ...process.env, EVAL_LIB: LIB_DIR },
  });
  const metrics = /^METRICS (.+)$/m.exec(r.stdout || '')?.[1] || '';
  return { pass: r.status === 0, output: `${r.stdout}${r.stderr}`.trim(), metrics };
}

// Dimensão do que o agente escreveu, em relação ao fixture: linhas de código e de testes (não vazias)
// e dependências declaradas. Mede "muito código para o que é" com um número.
const CODE_EXT = /\.(js|mjs|cjs|ts|tsx|jsx|py|css|scss|html|vue|svelte|go|rs|java|cs|rb|php)$/i;
const NOT_CODE_DIR = /(^|\/)(node_modules|dist|build|coverage|docs|\.studio|\.claude|\.git)(\/|$)/;
const TEST_FILE = /(^|\/)(test|tests|__tests__|spec)\/|\.(test|spec)\.[a-z]+$|(^|\/)test_[^/]*\.py$|_test\.py$/i;

function codeStats(ws) {
  const sh = (c) => execSync(c, { cwd: ws, stdio: 'pipe', maxBuffer: 64 * 1024 * 1024 }).toString();
  const nonBlank = (text) => text.split(/\r?\n/).filter((l) => l.trim()).length;
  const count = (files, read) => {
    const out = { loc: 0, tests: 0 };
    for (const f of files) {
      if (!CODE_EXT.test(f) || NOT_CODE_DIR.test(f) || f.startsWith('.eval-')) continue;
      const n = nonBlank(read(f));
      if (TEST_FILE.test(f)) out.tests += n; else out.loc += n;
    }
    return out;
  };
  const deps = (read) => {
    try {
      const pkg = JSON.parse(read('package.json'));
      return Object.keys({ ...pkg.dependencies, ...pkg.devDependencies }).length;
    } catch { /* sem package.json */ }
    try { return read('requirements.txt').split(/\r?\n/).filter((l) => l.trim() && !l.startsWith('#')).length; } catch { return 0; }
  };
  try {
    const root = sh('git rev-list --max-parents=0 HEAD').trim().split('\n')[0];
    const before = sh(`git ls-tree -r --name-only ${root}`).split('\n').filter(Boolean);
    const readBefore = (f) => sh(`git show ${root}:"${f}"`);
    const now = sh('git ls-files --cached --others --exclude-standard').split('\n').filter(Boolean);
    const readNow = (f) => fs.readFileSync(path.join(ws, f), 'utf8');
    const a = count(before, readBefore);
    const b = count(now.filter((f) => fs.existsSync(path.join(ws, f))), readNow);
    return { loc: b.loc - a.loc, loc_tests: b.tests - a.tests, deps: deps(readNow) - deps(readBefore) };
  } catch {
    return {};
  }
}

function runClaude(prompt, ws, agent) {
  const args = [
    '-p', '--output-format', 'json',
    '--model', model,
    ...(agent ? ['--agent', agent] : []),
    '--plugin-dir', PLUGIN_DIR,
    ...extraPlugins.flatMap((p) => ['--plugin-dir', p]),
    ...(settingsFile ? ['--settings', path.resolve(settingsFile)] : []),
    // auto: um classificador aprova ações seguras sem humano; os guardrails do plugin continuam ativos.
    '--permission-mode', 'auto',
    // O estúdio lê lições e templates fora do workspace. Só estas pastas: evals/ (checks e referências) fica inacessível.
    '--add-dir', PLUGIN_DIR, path.join(ROOT, 'knowledge'),
    '--allowedTools', ...ALLOWED_TOOLS,
  ];
  const r = spawnSync('claude', args, {
    cwd: ws, input: prompt, encoding: 'utf8', shell: process.platform === 'win32',
    timeout: 60 * 60 * 1000, maxBuffer: 64 * 1024 * 1024,
  });
  try {
    return JSON.parse(r.stdout);
  } catch {
    return { is_error: true, result: `${r.stdout || ''}${r.stderr || ''}`.slice(-2000) };
  }
}

function csvRow(values) {
  return values.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',') + '\n';
}

if (statsOnly) {
  console.log(JSON.stringify(codeStats(path.resolve(statsOnly))));
  process.exit(0);
}

const tasks = fs.readdirSync(TASKS_DIR)
  .filter((d) => fs.existsSync(path.join(TASKS_DIR, d, 'task.md')))
  .filter((d) => !onlyTasks || onlyTasks.includes(d))
  .sort();

if (tasks.length === 0) {
  console.error('Nenhuma tarefa encontrada.');
  process.exit(1);
}

if (!dryRun && !fs.existsSync(RESULTS)) {
  fs.writeFileSync(RESULTS, csvRow(HEADER));
} else if (!dryRun) {
  // Migra ficheiros criados antes da coluna "metricas".
  const lines = fs.readFileSync(RESULTS, 'utf8').split(/\r?\n/).filter(Boolean);
  if (!lines[0].includes('"metricas"')) {
    fs.writeFileSync(RESULTS, lines.map((l) => `${l},"${l === lines[0] ? 'metricas' : ''}"`).join('\n') + '\n');
  }
}

const version = studioVersion();
let failures = 0;

for (const id of tasks) {
  const taskDir = path.join(TASKS_DIR, id);
  const taskText = fs.readFileSync(path.join(taskDir, 'task.md'), 'utf8').trim();
  const readOpt = (name) => (fs.existsSync(path.join(taskDir, name)) ? fs.readFileSync(path.join(taskDir, name), 'utf8').trim() : undefined);
  const command = readOpt('command') || '/studio:build';
  const flags = readOpt('flags') ?? (command === '/studio:build' ? '--skip-idea' : '');
  const agent = command.startsWith('agent:') ? command.slice('agent:'.length).trim() : undefined;
  const prompt = agent ? taskText : `${command} --auto ${flags}\n\n${taskText}`.replace(/ +\n/, '\n');

  if (dryRun) {
    const problems = [];
    const before = prepareWorkspace(taskDir, id);
    const beforeCheck = runCheck(taskDir, before);
    if (beforeCheck.pass) problems.push('passa sem trabalho feito');
    fs.rmSync(before, { recursive: true, force: true });
    if (!fs.existsSync(path.join(taskDir, 'reference'))) {
      problems.push('sem reference/');
    } else {
      const after = prepareWorkspace(taskDir, id, true);
      const afterCheck = runCheck(taskDir, after);
      if (!afterCheck.pass) problems.push(`falha com a referência:\n${afterCheck.output.split('\n').slice(-10).map((l) => `      ${l}`).join('\n')}`);
      fs.rmSync(after, { recursive: true, force: true });
    }
    if (problems.length) failures++;
    console.log(`${problems.length ? 'ERRO' : 'OK '} ${id}${problems.length ? ': ' + problems.join('; ') : ''}`);
    continue;
  }

  const ws = prepareWorkspace(taskDir, id);

  console.log(`→ ${id} …`);
  // Tempo medido aqui: o duration_ms do JSON só cobre o último turno quando o orquestrador espera por subagentes.
  const started = Date.now();
  const out = runClaude(prompt, ws, agent);
  const seconds = Math.round((Date.now() - started) / 1000);
  fs.writeFileSync(path.join(ws, '.eval-output.txt'), String(out.result || ''));
  const check = runCheck(taskDir, ws);
  if (!check.pass) failures++;
  let checkMetrics = {};
  try { checkMetrics = check.metrics ? JSON.parse(check.metrics) : {}; } catch { checkMetrics = { raw: check.metrics }; }
  const metrics = JSON.stringify({ ...codeStats(ws), ...checkMetrics });
  fs.appendFileSync(RESULTS, csvRow([
    new Date().toISOString(), version, label, model, id, check.pass ? 'sim' : 'nao',
    out.total_cost_usd?.toFixed?.(4), seconds, out.num_turns, out.is_error ? 'sim' : '', ws, metrics,
  ]));
  console.log(`  ${check.pass ? 'PASSOU' : 'FALHOU'} · $${out.total_cost_usd?.toFixed?.(2) ?? '?'} · ${seconds}s · ${metrics}`);
  if (!check.pass) {
    console.log(check.output.split('\n').slice(-15).map((l) => `    ${l}`).join('\n'));
    console.log(`  Resposta final do agente:\n${String(out.result || '').slice(-1500).split('\n').map((l) => `    ${l}`).join('\n')}`);
  }
}

console.log(`\n${tasks.length - failures}/${tasks.length} ${dryRun ? 'checks válidos' : 'tarefas passaram'}${dryRun ? '' : ` · resultados em ${path.relative(process.cwd(), RESULTS)}`}`);
process.exit(failures ? 1 : 0);
