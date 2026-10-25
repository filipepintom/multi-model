#!/usr/bin/env node
// UserPromptSubmit: quando o pedido é /studio:build, /studio:audit ou /studio:retro, injeta no contexto as lições e as
// preferências do utilizador. Assim o agente não precisa de as ler com ferramentas (o que pediria acesso a uma pasta
// fora do projeto) e não se pode esquecer de as ler.
// A pasta vem de STUDIO_KNOWLEDGE_DIR; por omissão, a pasta knowledge/ do repositório do estúdio.
// Erros deixam passar sem contexto (fail-open): o hook nunca pode bloquear um pedido.

const fs = require('fs');
const path = require('path');

const DIR = process.env.STUDIO_KNOWLEDGE_DIR || 'C:/Projects/multi-model/knowledge';
const FILES = ['lessons.md', 'preferences.md'];
const MAX_CHARS = 30000;

let raw = '';
process.stdin.on('data', (c) => { raw += c; });
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(raw);
    const prompt = String(data.prompt ?? data.user_prompt ?? '');
    if (!/^\s*\/studio:(build|audit|retro)\b/.test(prompt)) process.exit(0);

    const parts = [`# Conhecimento do estúdio (injetado pelo plugin)\n\nPasta: ${DIR} — é aqui que a retro grava lições e preferências.`];
    for (const name of FILES) {
      const file = path.join(DIR, name);
      if (fs.existsSync(file)) parts.push(`## ${name}\n\n${fs.readFileSync(file, 'utf8').trim()}`);
    }
    let context = parts.join('\n\n');
    if (context.length > MAX_CHARS) context = `${context.slice(0, MAX_CHARS)}\n\n[truncado: lê o resto em ${DIR}]`;
    process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'UserPromptSubmit', additionalContext: context } }));
  } catch {
    // fail-open
  }
  process.exit(0);
});
