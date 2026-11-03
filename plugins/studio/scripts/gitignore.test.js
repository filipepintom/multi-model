// The repo's .gitignore must not hide files added to the shipped plugin folders.
const { test } = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..', '..', '..');

test('new files in plugins/studio/knowledge are not ignored', () => {
  const r = spawnSync('git', ['check-ignore', '-q', 'plugins/studio/knowledge/new-lessons.md'], { cwd: repoRoot });
  assert.strictEqual(r.status, 1, 'git check-ignore matched: the file would be left out of the plugin');
});
