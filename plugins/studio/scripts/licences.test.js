const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const studio = path.resolve(__dirname, '..');
const vendor = JSON.parse(fs.readFileSync(path.join(studio, 'vendor.json'), 'utf8'));
const folder = (key) => (key === 'context7' ? 'context7-mcp' : key);

test('every vendored skill ships its LICENSE', () => {
  for (const key of Object.keys(vendor)) {
    const f = path.join(studio, 'skills', folder(key), 'LICENSE');
    assert.ok(fs.existsSync(f), `missing ${f}`);
  }
});

test('THIRD_PARTY_NOTICES.md covers modern-screenshot', () => {
  assert.match(fs.readFileSync(path.join(studio, 'THIRD_PARTY_NOTICES.md'), 'utf8'), /modern-screenshot/);
});

test('plugin.json declares a license and studio has its own LICENSE', () => {
  const plugin = JSON.parse(fs.readFileSync(path.join(studio, '.claude-plugin', 'plugin.json'), 'utf8'));
  assert.ok(plugin.license);
  assert.ok(fs.existsSync(path.join(studio, 'LICENSE')));
});
