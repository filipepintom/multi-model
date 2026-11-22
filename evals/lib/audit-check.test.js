const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { readAuditState } = require('./audit-check.js');

function tmpState(content) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-state-'));
  if (content !== null) fs.writeFileSync(path.join(dir, 'state.md'), content);
  return dir;
}

const FM = '---\nslug: x\nproduct: inferred\ndesign: no-ui\nrebuild: No (porque sim)\nrebuild_signals: baseline (tests no), effort-L (21/30)\n---\n';

test('lê os valores; primeiro token em minúsculas, sinais com a linha toda', () => {
  const s = readAuditState(tmpState(FM));
  assert.deepStrictEqual(s, { rebuild: 'no', rebuild_signals: 'baseline (tests no), effort-L (21/30)', product: 'inferred', design: 'no-ui' });
});

test('aceita CRLF', () => {
  const s = readAuditState(tmpState(FM.replace(/\n/g, '\r\n')));
  assert.strictEqual(s.rebuild, 'no');
  assert.strictEqual(s.design, 'no-ui');
  assert.strictEqual(s.rebuild_signals, 'baseline (tests no), effort-L (21/30)');
});

test('chave em falta dá null', () => {
  const s = readAuditState(tmpState('---\nrebuild: candidate\n---\n'));
  assert.deepStrictEqual(s, { rebuild: 'candidate', rebuild_signals: null, product: null, design: null });
});

test('ficheiro em falta dá null', () => {
  const s = readAuditState(tmpState(null));
  assert.deepStrictEqual(s, { rebuild: null, rebuild_signals: null, product: null, design: null });
});

test('linha rebuild: no corpo, depois do frontmatter, é ignorada', () => {
  const s = readAuditState(tmpState('---\nslug: x\n---\n\nrebuild: candidate\n'));
  assert.strictEqual(s.rebuild, null);
});

// runAuditCheck: não testado aqui; chama process.exit e exige um repositório git (sourceChanges). Coberto pelo --dry-run.
