import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
  resolveContext,
  initKnowledgeBase,
  collectMarkdownFiles,
  parseFrontmatter,
  extractWikiLinks,
  buildIndex,
  lintKnowledgeBase,
  getLinks,
  buildReport,
} from './obsidian-kb.mjs';

async function makeTempWorkspace() {
  return mkdtemp(path.join(tmpdir(), 'obsidian-kb-'));
}

async function writeNote(root, relativePath, content) {
  const fullPath = path.join(root, relativePath);
  await mkdir(path.dirname(fullPath), { recursive: true });
  await writeFile(fullPath, content, 'utf8');
  return fullPath;
}

test('resolveContext defaults kbRoot to cwd/code-kb', async () => {
  const workspace = await makeTempWorkspace();
  try {
    const context = resolveContext({ cwd: workspace, args: [] });
    assert.equal(context.workspaceRoot, workspace);
    assert.equal(context.kbRoot, path.join(workspace, 'code-kb'));
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
});

test('resolveContext honors --kb-root override', async () => {
  const workspace = await makeTempWorkspace();
  try {
    const custom = path.join(workspace, 'custom-kb');
    const context = resolveContext({ cwd: workspace, args: ['--kb-root', custom] });
    assert.equal(context.kbRoot, custom);
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
});

test('initKnowledgeBase creates product-line directories without overwriting notes', async () => {
  const workspace = await makeTempWorkspace();
  const kbRoot = path.join(workspace, 'code-kb');
  try {
    await initKnowledgeBase({ kbRoot });
    await writeFile(path.join(kbRoot, 'index.md'), 'human content', 'utf8');
    await initKnowledgeBase({ kbRoot });
    const index = await readFile(path.join(kbRoot, 'index.md'), 'utf8');
    assert.equal(index, 'human content');
    const productLine = await readFile(path.join(kbRoot, 'product-line.md'), 'utf8');
    assert.match(productLine, /type: product-line/);
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
});

test('parseFrontmatter reads properties and extractWikiLinks reads wikilinks', () => {
  const note = `---
title: Flow A
type: flow
scope: product-line
repo: global
confidence: high
status: active
sources:
  - repos/a/src/main.ts:start()
---
# Flow A
See [[domains/Domain A]] and [[contracts/Contract A|contract]].
`;
  const parsed = parseFrontmatter(note);
  assert.equal(parsed.data.title, 'Flow A');
  assert.equal(parsed.data.type, 'flow');
  assert.deepEqual(parsed.data.sources, ['repos/a/src/main.ts:start()']);
  assert.deepEqual(extractWikiLinks(note), ['domains/Domain A', 'contracts/Contract A']);
});

test('parseFrontmatter supports CRLF line endings', () => {
  const note = [
    '---',
    'title: Windows Note',
    'type: flow',
    'scope: product-line',
    'repo: global',
    'confidence: high',
    'status: active',
    'sources:',
    '  - repos/a/src/main.ts:start()',
    '---',
    '# Windows Note',
  ].join('\r\n');

  const parsed = parseFrontmatter(note);

  assert.equal(parsed.data.title, 'Windows Note');
  assert.equal(parsed.data.type, 'flow');
  assert.deepEqual(parsed.data.sources, ['repos/a/src/main.ts:start()']);
});

test('buildIndex records pages, properties, outgoing links, and incoming links', async () => {
  const workspace = await makeTempWorkspace();
  const kbRoot = path.join(workspace, 'code-kb');
  try {
    await initKnowledgeBase({ kbRoot });
    await writeNote(kbRoot, 'domains/Domain A.md', `---
title: Domain A
type: domain
scope: product-line
repo: global
confidence: high
status: active
sources:
  - repos/a/src/domain.ts
---
# Domain A
`);
    await writeNote(kbRoot, 'flows/Flow A.md', `---
title: Flow A
type: flow
scope: product-line
repo: global
domain:
  - Domain A
confidence: medium
status: active
sources:
  - repos/a/src/main.ts:start()
---
# Flow A
Related to [[domains/Domain A]] and [[contracts/Contract A]].
`);
    const index = await buildIndex({ kbRoot, writeIndexes: false });
    assert.equal(index.pages.length >= 2, true);
    const flow = index.pages.find((page) => page.relativePath === 'flows/Flow A.md');
    assert.deepEqual(flow.outgoingLinks.sort(), ['contracts/Contract A', 'domains/Domain A']);
    assert.deepEqual(index.incomingLinks.get('domains/Domain A.md'), ['flows/Flow A.md']);
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
});

test('lintKnowledgeBase reports missing required properties and orphan pages', async () => {
  const workspace = await makeTempWorkspace();
  const kbRoot = path.join(workspace, 'code-kb');
  try {
    await initKnowledgeBase({ kbRoot });
    await writeNote(kbRoot, 'flows/Broken.md', '# Broken\n');
    const result = await lintKnowledgeBase({ kbRoot });
    assert.equal(result.issues.some((issue) => issue.type === 'frontmatter'), true);
    assert.equal(result.issues.some((issue) => issue.type === 'orphan'), true);
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
});

test('lintKnowledgeBase treats empty sources array as present', async () => {
  const workspace = await makeTempWorkspace();
  const kbRoot = path.join(workspace, 'code-kb');
  try {
    await initKnowledgeBase({ kbRoot });
    const result = await lintKnowledgeBase({ kbRoot });
    assert.equal(
      result.issues.some((issue) => issue.message === 'Missing required property: sources'),
      false,
    );
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
});

test('lintKnowledgeBase validates created, updated, and page type contract', async () => {
  const workspace = await makeTempWorkspace();
  const kbRoot = path.join(workspace, 'code-kb');
  try {
    await initKnowledgeBase({ kbRoot });
    await writeNote(kbRoot, 'domains/Bad Type.md', `---
title: Bad Type
type: unknown-type
scope: product-line
repo: global
confidence: high
status: active
sources:
  - repos/a/src/domain.ts
---
# Bad Type
`);
    const result = await lintKnowledgeBase({ kbRoot });
    assert.equal(
      result.issues.some((issue) => issue.message === 'Missing required property: created'),
      true,
    );
    assert.equal(
      result.issues.some((issue) => issue.message === 'Missing required property: updated'),
      true,
    );
    assert.equal(
      result.issues.some((issue) => issue.message === 'Invalid type: unknown-type'),
      true,
    );
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
});

test('getLinks returns incoming and outgoing links for a target', async () => {
  const workspace = await makeTempWorkspace();
  const kbRoot = path.join(workspace, 'code-kb');
  try {
    await initKnowledgeBase({ kbRoot });
    await writeNote(kbRoot, 'domains/Domain A.md', `---
title: Domain A
type: domain
scope: product-line
repo: global
confidence: high
status: active
sources:
  - repos/a/src/domain.ts
---
# Domain A
`);
    await writeNote(kbRoot, 'flows/Flow A.md', `---
title: Flow A
type: flow
scope: product-line
repo: global
confidence: high
status: active
sources:
  - repos/a/src/main.ts:start()
---
# Flow A
Uses [[domains/Domain A]].
`);
    const links = await getLinks({ kbRoot, target: 'domains/Domain A.md' });
    assert.deepEqual(links.incoming, ['flows/Flow A.md']);
    assert.deepEqual(links.outgoing, []);
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
});

test('buildReport summarizes pages, confidence, and issue count', async () => {
  const workspace = await makeTempWorkspace();
  const kbRoot = path.join(workspace, 'code-kb');
  try {
    await initKnowledgeBase({ kbRoot });
    const report = await buildReport({ kbRoot });
    assert.equal(report.kbRoot, kbRoot);
    assert.equal(typeof report.pageCount, 'number');
    assert.equal(typeof report.issueCount, 'number');
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
});
