import test from 'node:test';
import assert from 'node:assert/strict';
import { parseYaml } from './yaml.mjs';

test('parses nested maps and scalars', () => {
  const doc = parseYaml('a:\n  b: 1\n  c: hello\n');
  assert.deepEqual(doc, { a: { b: '1', c: 'hello' } });
});

test('parses null via null and tilde', () => {
  assert.deepEqual(parseYaml('x: null\ny: ~\n'), { x: null, y: null });
});

test('parses block list of scalars', () => {
  assert.deepEqual(parseYaml('xs:\n  - one\n  - two\n'), { xs: ['one', 'two'] });
});

test('parses inline flow list', () => {
  assert.deepEqual(parseYaml('xs: [a, b, c]\n'), { xs: ['a', 'b', 'c'] });
});

test('parses empty inline list', () => {
  assert.deepEqual(parseYaml('xs: []\n'), { xs: [] });
});

test('parses list of maps with continuation keys', () => {
  const doc = parseYaml('rules:\n  - kind: prefix\n    value: repos/\n    message: hi\n  - kind: contains\n    value: /modules/\n');
  assert.deepEqual(doc, {
    rules: [
      { kind: 'prefix', value: 'repos/', message: 'hi' },
      { kind: 'contains', value: '/modules/' },
    ],
  });
});

test('strips full-line and trailing comments', () => {
  const doc = parseYaml('# header\na: 1   # inline\nb: 2\n');
  assert.deepEqual(doc, { a: '1', b: '2' });
});

test('strips quotes around scalars and list items', () => {
  assert.deepEqual(parseYaml("a: 'x'\nxs: ['/m/']\n"), { a: 'x', xs: ['/m/'] });
});

test('parses deep nesting (types -> type -> linkage)', () => {
  const doc = parseYaml('types:\n  flow:\n    view: runtime\n    linkage:\n      - requireFrontmatter: domain\n        message: m\n');
  assert.deepEqual(doc, {
    types: { flow: { view: 'runtime', linkage: [{ requireFrontmatter: 'domain', message: 'm' }] } },
  });
});

test('throws on a mapping line without colon', () => {
  assert.throws(() => parseYaml('a:\n  bogusline\n'));
});
