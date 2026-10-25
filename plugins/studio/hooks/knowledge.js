#!/usr/bin/env node
// UserPromptSubmit: em /studio:build, /studio:audit, /studio:retro e /studio:promote, injeta no contexto
//   1. as lições do plugin (comuns à equipa, distribuídas com o plugin, só leitura);
//   2. as lições e as preferências pessoais do utilizador (na pasta de dados persistente do plugin).
// Assim o agente não lê ficheiros fora do projeto (não há pedidos de acesso) e não se pode esquecer de os ler.
// A pasta pessoal é STUDIO_KNOWLEDGE_DIR, ou <CLAUDE_PLUGIN_DATA>/knowledge, ou ~/.claude/studio/knowledge.
// Na primeira vez cria a pasta pessoal com ficheiros vazios, para a retro só ter de os editar.
// Erros deixam passar sem contexto (fail-open): o hook nunca pode bloquear um pedido.

const fs = require('fs');
const os = require('os');
const path = require('path');

const PLUGIN_ROOT = process.env.CLAUDE_PLUGIN_ROOT || path.resolve(__dirname, '..');
const PLUGIN_LESSONS = path.join(PLUGIN_ROOT, 'knowledge', 'lessons.md');
const PERSONAL = process.env.STUDIO_KNOWLEDGE_DIR
  || (process.env.CLAUDE_PLUGIN_DATA ? path.join(process.env.CLAUDE_PLUGIN_DATA, 'knowledge') : path.join(os.homedir(), '.claude', 'studio', 'knowledge'));
const MAX_CHARS = 40000;

const SEEDS = {
  'lessons.md': `# As minhas lições

Lições pessoais, gravadas pela retro dos teus builds. Valem só para ti e, em caso de conflito, prevalecem sobre as lições do plugin.
As marcadas com \`(candidata)\` são propostas para as lições da equipa: o \`/studio:promote\` reúne-as.

# Geral

# Stack
`,
  'preferences.md': `# As minhas preferências

Observadas nos teus builds: decisões que alteraste no gate 1 e feedback que deste. Servem para as recomendações, nunca para decidir por ti.
`,
};

function ensurePersonal() {
  fs.mkdirSync(PERSONAL, { recursive: true });
  for (const [name, seed] of Object.entries(SEEDS)) {
    const file = path.join(PERSONAL, name);
    if (!fs.existsSync(file)) fs.writeFileSync(file, seed);
  }
}

const read = (file) => (fs.existsSync(file) ? fs.readFileSync(file, 'utf8').trim() : '(vazio)');

let raw = '';
process.stdin.on('data', (c) => { raw += c; });
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(raw);
    const prompt = String(data.prompt ?? data.user_prompt ?? '');
    if (!/^\s*\/studio:(build|audit|retro|promote)\b/.test(prompt)) process.exit(0);

    ensurePersonal();
    // Caminho longo real: um caminho 8.3 (com ~) é tratado como suspeito e cada escrita pediria aprovação manual.
    const personalDir = fs.realpathSync.native(PERSONAL).replace(/\\/g, '/');
    let context = [
      '# Conhecimento do estúdio (injetado pelo plugin)',
      `Lições do plugin: só leitura. Lições e preferências pessoais: editáveis em ${personalDir}/ (a retro grava aí). Em conflito, a lição pessoal prevalece para este utilizador.`,
      `## Lições do plugin (equipa)\n\n${read(PLUGIN_LESSONS)}`,
      `## As tuas lições (${personalDir}/lessons.md)\n\n${read(path.join(personalDir, 'lessons.md'))}`,
      `## As tuas preferências (${personalDir}/preferences.md)\n\n${read(path.join(personalDir, 'preferences.md'))}`,
    ].join('\n\n');
    if (context.length > MAX_CHARS) context = `${context.slice(0, MAX_CHARS)}\n\n[truncado: consolida as lições pessoais com /studio:retro]`;
    process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'UserPromptSubmit', additionalContext: context } }));
  } catch {
    // fail-open
  }
  process.exit(0);
});
