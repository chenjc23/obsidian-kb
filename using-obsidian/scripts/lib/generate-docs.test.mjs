import test from 'node:test';
import assert from 'node:assert/strict';
import { generateDocs } from './generate-docs.mjs';

test('generate-docs --check reports no drift on a freshly generated tree', async () => {
  const res = await generateDocs({ check: true });
  assert.deepEqual(res.drift, []);
});
