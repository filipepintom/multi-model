const { test } = require('node:test');
const assert = require('node:assert');
const { parseLine } = require('./csv');

test('linha simples', () => {
  assert.deepStrictEqual(parseLine('a,b,c'), ['a', 'b', 'c']);
});

test('campo único', () => {
  assert.deepStrictEqual(parseLine('abc'), ['abc']);
});
