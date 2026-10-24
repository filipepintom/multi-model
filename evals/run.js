#!/usr/bin/env node
// Corre as tarefas de referência contra a cópia de trabalho do plugin studio e regista resultados.
//
//   node evals/run.js                       todas as tarefas
//   node evals/run.js --task 001-slugify    uma tarefa (ou várias, separadas por vírgulas)
//   node evals/run.js --label "ponytail"    etiqueta a execução (para comparar variantes)
//   node evals/run.js --model sonnet        modelo do orquestrador (por omissão: opus)
//   node evals/run.js --dry-run             valida os checks: falham no fixture e passam com reference/ aplicada
//
// Cada tarefa: task.md (pedido), check.js (escondido), reference/ (solução de referência, só para validar),
// fixture/ (código inicial, opcional), command (comando do estúdio, opcional; por omissão /studio:build),
// flags (flags extra, opcional; por omissão --skip-idea no build e nada nos outros comandos).
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
  const fixture = path.join(taskDir, 'fixture');
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

function runClaude(prompt, ws) {
  const args = [
    '-p', '--output-format', 'json',
    '--model', model,
    '--plugin-dir', PLUGIN_DIR,
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
  const prompt = `${command} --auto ${flags}\n\n${taskText}`.replace(/ +\n/, '\n');

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
  const out = runClaude(prompt, ws);
  const seconds = Math.round((Date.now() - started) / 1000);
  const check = runCheck(taskDir, ws);
  if (!check.pass) failures++;
  fs.appendFileSync(RESULTS, csvRow([
    new Date().toISOString(), version, label, model, id, check.pass ? 'sim' : 'nao',
    out.total_cost_usd?.toFixed?.(4), seconds, out.num_turns, out.is_error ? 'sim' : '', ws, check.metrics,
  ]));
  console.log(`  ${check.pass ? 'PASSOU' : 'FALHOU'} · $${out.total_cost_usd?.toFixed?.(2) ?? '?'} · ${seconds}s${check.metrics ? ` · ${check.metrics}` : ''}`);
  if (!check.pass) {
    console.log(check.output.split('\n').slice(-15).map((l) => `    ${l}`).join('\n'));
    console.log(`  Resposta final do agente:\n${String(out.result || '').slice(-1500).split('\n').map((l) => `    ${l}`).join('\n')}`);
  }
}

console.log(`\n${tasks.length - failures}/${tasks.length} ${dryRun ? 'checks válidos' : 'tarefas passaram'}${dryRun ? '' : ` · resultados em ${path.relative(process.cwd(), RESULTS)}`}`);
process.exit(failures ? 1 : 0);
