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

test('parseYaml handles pipeline nesting: seq items with inline lists and nested maps', () => {
  const text = `pipelines:
  ingest:
    description: first pass
    stages:
      - id: terrain
        produces: [repos/{repo}/overview.md, repos/{repo}/architecture.md]
        requires: []
        instruction: pipelines/ingest/terrain.md
        done:
          exists: produces
      - id: deep-dive
        requires: [terrain]
        tracks: repos/{repo}/candidate-flow.md
        done:
          tracksAllComplete: 已深挖
`;
  const reg = parseYaml(text);
  const stages = reg.pipelines.ingest.stages;
  assert.equal(reg.pipelines.ingest.description, 'first pass');
  assert.equal(stages.length, 2);
  assert.equal(stages[0].id, 'terrain');
  assert.deepEqual(stages[0].produces, ['repos/{repo}/overview.md', 'repos/{repo}/architecture.md']);
  assert.deepEqual(stages[0].requires, []);
  assert.equal(stages[0].instruction, 'pipelines/ingest/terrain.md');
  assert.equal(stages[0].done.exists, 'produces');
  assert.equal(stages[1].done.tracksAllComplete, '已深挖');
  assert.deepEqual(stages[1].requires, ['terrain']);
});
