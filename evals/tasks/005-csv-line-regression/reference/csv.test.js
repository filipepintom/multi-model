const { test } = require('node:test');
const assert = require('node:assert');
const { parseLine } = require('./csv');

test('linha simples', () => {
  assert.deepStrictEqual(parseLine('a,b,c'), ['a', 'b', 'c']);
});

test('campo único', () => {
  assert.deepStrictEqual(parseLine('abc'), ['abc']);
});

test('vírgula dentro de aspas', () => {
  assert.deepStrictEqual(parseLine('a,"b,c",d'), ['a', 'b,c', 'd']);
});

test('aspas escapadas', () => {
  assert.deepStrictEqual(parseLine('"ele disse ""olá""",x'), ['ele disse "olá"', 'x']);
});

test('campos vazios', () => {
  assert.deepStrictEqual(parseLine(',a,'), ['', 'a', '']);
  assert.deepStrictEqual(parseLine(''), ['']);
  assert.deepStrictEqual(parseLine('a,,b'), ['a', '', 'b']);
});
