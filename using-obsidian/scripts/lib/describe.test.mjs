import test from 'node:test';
import assert from 'node:assert/strict';
import { describe, describeData } from './describe.mjs';

test('describeData exposes types, views, shapes, tree from registry', () => {
  const d = describeData();
  assert.ok(d.types.includes('contract'));
  assert.equal(d.views.find((v) => v.type === 'flow').view, 'runtime');
  const overviewShape = d.shapes.find((s) => s.type === 'overview');
  assert.ok(overviewShape.sections.includes('职责边界'));
  assert.match(d.tree, /code-kb\//);
});

test('describe prints a chosen section', () => {
  const out = describe({ section: 'tree' });
  assert.match(out, /code-kb\//);
  assert.match(out, /flows\//);
});

test('describe with no section prints all four', () => {
  const out = describe({});
  assert.match(out, /type 枚举/);
  assert.match(out, /视图透镜/);
  assert.match(out, /页型形状/);
  assert.match(out, /目录树/);
});

test('describe throws on unknown section', () => {
  assert.throws(() => describe({ section: 'nope' }), /未知视图/);
});

test('describeData exposes pipelines with stage ids', () => {
  const d = describeData();
  const ingest = d.pipelines.find((p) => p.name === 'ingest');
  assert.ok(ingest);
  assert.ok(ingest.stages.some((s) => s.id === 'terrain'));
});

test('describe prints pipeline section', () => {
  const out = describe({ section: 'pipeline' });
  assert.match(out, /ingest/);
  assert.match(out, /terrain/);
});
