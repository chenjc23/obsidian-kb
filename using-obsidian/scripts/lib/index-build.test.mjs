import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { buildIndex } from './index-build.mjs';

test('buildIndex preserves arbitrary new frontmatter fields without code change', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'idx-'));
  await mkdir(path.join(root, 'global'), { recursive: true });
  await writeFile(path.join(root, 'global', 'p.md'), `---
title: P
type: contract
repo: global
created: 2026-07-01
updated: 2026-07-01
confidence: high
status: active
sources: []
provider:
  - resource-service
---
# P
`, 'utf8');
  const index = await buildIndex({ kbRoot: root, writeIndexes: false });
  const page = index.pages.find((p) => p.relativePath === 'global/p.md');
  assert.deepEqual(page.data.provider, ['resource-service']);
});
