// Shared by hooks/knowledge.js and scripts/doctor.js: where the personal lessons folder lives.
const fs = require('fs');
const os = require('os');
const path = require('path');

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
}

function knowledgeDir(env = process.env, home = os.homedir()) {
  if (env.STUDIO_KNOWLEDGE_DIR) return env.STUDIO_KNOWLEDGE_DIR;
  if (env.CLAUDE_PLUGIN_DATA) return path.join(env.CLAUDE_PLUGIN_DATA, 'knowledge');
  const claudeDir = env.CLAUDE_CONFIG_DIR || path.join(home, '.claude');
  const installed = readJson(path.join(claudeDir, 'plugins', 'installed_plugins.json'));
  const key = Object.keys((installed && installed.plugins) || {}).find((k) => k.startsWith('studio@'));
  if (key) return path.join(claudeDir, 'plugins', 'data', `studio-${key.slice('studio@'.length)}`, 'knowledge');
  return path.join(claudeDir, 'studio', 'knowledge');
}

module.exports = { knowledgeDir };
