#!/usr/bin/env node
// Corre as tarefas de referência contra a cópia de trabalho do plugin studio e regista resultados.
//
//   node evals/run.js                       todas as tarefas
//   node evals/run.js --task 001-slugify    uma tarefa
//   node evals/run.js --label "ponytail"    etiqueta a execução (para comparar variantes)
//   node evals/run.js --model sonnet        modelo do orquestrador (por omissão: opus)
//   node evals/run.js --dry-run             prepara workspaces e confirma que os checks falham sem trabalho feito

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync, execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const TASKS_DIR = path.join(__dirname, 'tasks');
const RESULTS = path.join(__dirname, 'results.csv');
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
const onlyTask = arg('--task');
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

function prepareWorkspace(taskDir, id) {
  // Caminho longo real: nomes 8.3 (EXT_TI~1) são tratados como suspeitos e exigem aprovação manual.
  const tmp = fs.realpathSync.native(os.tmpdir());
  const ws = fs.realpathSync.native(fs.mkdtempSync(path.join(tmp, `studio-eval-${id}-`)));
  const fixture = path.join(taskDir, 'fixture');
  if (fs.existsSync(fixture)) fs.cpSync(fixture, ws, { recursive: true });
  else fs.writeFileSync(path.join(ws, 'README.md'), `# ${id}\n`);
  git('init -q -b main', ws);
  git('add -A', ws);
  git('commit -q -m "fixture"', ws);
  return ws;
}

function runCheck(taskDir, ws) {
  fs.copyFileSync(path.join(taskDir, 'check.js'), path.join(ws, '.eval-check.js'));
  const r = spawnSync('node', ['.eval-check.js'], { cwd: ws, encoding: 'utf8' });
  return { pass: r.status === 0, output: `${r.stdout}${r.stderr}`.trim() };
}

function runClaude(prompt, ws) {
  const args = [
    '-p', '--output-format', 'json',
    '--model', model,
    '--plugin-dir', PLUGIN_DIR,
    // auto: um classificador aprova ações seguras sem humano; os guardrails do plugin continuam ativos.
    '--permission-mode', 'auto',
    // O estúdio lê lições e templates fora do workspace.
    '--add-dir', ROOT,
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
  .filter((d) => !onlyTask || d === onlyTask)
  .sort();

if (tasks.length === 0) {
  console.error('Nenhuma tarefa encontrada.');
  process.exit(1);
}

if (!dryRun && !fs.existsSync(RESULTS)) {
  fs.writeFileSync(RESULTS, csvRow(['data', 'versao_studio', 'label', 'modelo', 'tarefa', 'passou', 'custo_usd', 'duracao_s', 'turnos', 'erro', 'workspace']));
}

const version = studioVersion();
let failures = 0;

for (const id of tasks) {
  const taskDir = path.join(TASKS_DIR, id);
  const ws = prepareWorkspace(taskDir, id);
  const taskText = fs.readFileSync(path.join(taskDir, 'task.md'), 'utf8').trim();
  const prompt = `/studio:build --auto --skip-idea\n\n${taskText}`;

  if (dryRun) {
    const check = runCheck(taskDir, ws);
    const ok = !check.pass;
    if (!ok) failures++;
    console.log(`${ok ? 'OK ' : 'ERRO'} ${id}: o check ${check.pass ? 'PASSA sem trabalho feito (check inútil)' : 'falha antes do trabalho, como esperado'}`);
    fs.rmSync(ws, { recursive: true, force: true });
    continue;
  }

  console.log(`→ ${id} …`);
  const out = runClaude(prompt, ws);
  const check = runCheck(taskDir, ws);
  if (!check.pass) failures++;
  fs.appendFileSync(RESULTS, csvRow([
    new Date().toISOString(), version, label, model, id, check.pass ? 'sim' : 'nao',
    out.total_cost_usd?.toFixed?.(4), out.duration_ms ? Math.round(out.duration_ms / 1000) : '',
    out.num_turns, out.is_error ? 'sim' : '', ws,
  ]));
  console.log(`  ${check.pass ? 'PASSOU' : 'FALHOU'} · $${out.total_cost_usd?.toFixed?.(2) ?? '?'} · ${out.duration_ms ? Math.round(out.duration_ms / 1000) + 's' : '?'}`);
  if (!check.pass) {
    console.log(check.output.split('\n').slice(-15).map((l) => `    ${l}`).join('\n'));
    console.log(`  Resposta final do agente:\n${String(out.result || '').slice(-1500).split('\n').map((l) => `    ${l}`).join('\n')}`);
  }
}

console.log(`\n${tasks.length - failures}/${tasks.length} ${dryRun ? 'checks válidos' : 'tarefas passaram'}${dryRun ? '' : ` · resultados em ${path.relative(process.cwd(), RESULTS)}`}`);
process.exit(failures ? 1 : 0);
