const test = require('node:test');
const assert = require('node:assert');
const { initialState, reducer } = require('./search-state.js');

const typed = (q, s = initialState) => reducer(s, { type: 'QUERY_CHANGED', query: q });

test('estado inicial é idle', () => {
  assert.strictEqual(initialState.status, 'idle');
});

test('escrever passa a loading e vazio volta a idle', () => {
  const s = typed('ma');
  assert.strictEqual(s.status, 'loading');
  assert.strictEqual(s.query, 'ma');
  assert.strictEqual(typed('   ', s).status, 'idle');
});

test('resultados levam a success ou empty', () => {
  const s = typed('ma');
  const ok = reducer(s, { type: 'RESULTS_RECEIVED', query: 'ma', results: [{ id: 1, name: 'Maçã' }] });
  assert.strictEqual(ok.status, 'success');
  assert.strictEqual(ok.results.length, 1);
  assert.strictEqual(reducer(s, { type: 'RESULTS_RECEIVED', query: 'ma', results: [] }).status, 'empty');
});

test('resposta desatualizada é ignorada', () => {
  const s = typed('mac', typed('ma'));
  assert.strictEqual(reducer(s, { type: 'RESULTS_RECEIVED', query: 'ma', results: [{ id: 1, name: 'x' }] }), s);
  assert.strictEqual(reducer(s, { type: 'REQUEST_FAILED', query: 'ma', error: 'x' }), s);
});

test('falha e retry', () => {
  const failed = reducer(typed('ma'), { type: 'REQUEST_FAILED', query: 'ma', error: new Error('boom') });
  assert.strictEqual(failed.status, 'error');
  const retry = reducer(failed, { type: 'RETRY' });
  assert.strictEqual(retry.status, 'loading');
  assert.strictEqual(retry.query, 'ma');
  assert.strictEqual(reducer(initialState, { type: 'RETRY' }), initialState);
});
