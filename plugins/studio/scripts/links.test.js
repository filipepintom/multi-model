// The studio skills hand off to each other through relative links (build → retro, audit → build and retro).
// Skills with disable-model-invocation cannot be invoked by the model, so a broken link breaks the pipeline.
// Run: node --test plugins/studio/scripts/links.test.js
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const SKILLS = path.join(__dirname, '..', 'skills');

test('relative links in the studio skills point to files that exist', () => {
  for (const name of ['build', 'audit', 'reverse', 'retro', 'setup']) {
    const file = path.join(SKILLS, name, 'SKILL.md');
    for (const m of fs.readFileSync(file, 'utf8').matchAll(/\]\(([^)#:\s]+)\)/g)) {
      assert.ok(fs.existsSync(path.join(path.dirname(file), m[1])), `${name}/SKILL.md → ${m[1]}`);
    }
  }
});

test('the build and the audit reach the retro by a link, not by a command the model cannot invoke', () => {
  for (const name of ['build', 'audit']) {
    assert.match(fs.readFileSync(path.join(SKILLS, name, 'SKILL.md'), 'utf8'), /\]\(\.\.\/retro\/SKILL\.md\)/, name);
  }
});
