#!/usr/bin/env node
// SubagentStart: injeta as regras do Ponytail (skills/ponytail/SKILL.md, incluída no plugin) nos subagentes do estúdio
// (agent_type "studio:*"). O contexto de SessionStart não chega aos subagentes, e são eles que escrevem o código.
// Só os agentes do estúdio: os subagentes de outro trabalho na mesma sessão não são tocados.
// Sem agent_type legível (stdin vazio ou inválido), não injeta: o hook nunca bloqueia nem atrasa um subagente.

const fs = require('fs');
const path = require('path');

const PLUGIN_ROOT = process.env.CLAUDE_PLUGIN_ROOT || path.resolve(__dirname, '..');
const SKILL = path.join(PLUGIN_ROOT, 'skills', 'ponytail', 'SKILL.md');

function rules() {
  const body = fs.readFileSync(SKILL, 'utf8').replace(/^---[\s\S]*?\n---\s*/, '');
  return `PONYTAIL MODE ACTIVE — level: full\n\n${body.trim()}`;
}

let raw = '';
let done = false;
function finish() {
  if (done) return;
  done = true;
  try {
    const type = String(JSON.parse(raw).agent_type || '');
    if (type.startsWith('studio:')) {
      process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'SubagentStart', additionalContext: rules() } }));
    }
  } catch {
    // fail-open: sem injeção
  }
  process.exit(0);
}

process.stdin.on('data', (c) => { raw += c; });
process.stdin.on('end', finish);
process.stdin.on('error', finish);
setTimeout(finish, 1500);
