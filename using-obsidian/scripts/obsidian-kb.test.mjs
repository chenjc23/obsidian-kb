import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
const execFileP = promisify(execFile);
const CLI = fileURLToPath(new URL('./obsidian-kb.mjs', import.meta.url));
async function run(args) { return execFileP('node', [CLI, ...args], { timeout: 15000 }); }

import {
  resolveContext,
  initKnowledgeBase,
  collectMarkdownFiles,
  parseFrontmatter,
  extractWikiLinks,
  buildIndex,
  lintKnowledgeBase,
  getLinks,
  searchKnowledgeBase,
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

test('initKnowledgeBase creates workspace directories without overwriting notes or generated indexes', async () => {
  const workspace = await makeTempWorkspace();
  const kbRoot = path.join(workspace, 'code-kb');
  try {
    await initKnowledgeBase({ kbRoot });
    await writeFile(path.join(kbRoot, 'index.md'), 'human content', 'utf8');
    await initKnowledgeBase({ kbRoot });
    const index = await readFile(path.join(kbRoot, 'index.md'), 'utf8');
    assert.equal(index, 'human content');
    await assert.rejects(readFile(path.join(kbRoot, 'product-line.md'), 'utf8'));
    await assert.rejects(readFile(path.join(kbRoot, 'glossary.md'), 'utf8'));
    await assert.rejects(readFile(path.join(kbRoot, 'indexes', 'flow-index.md'), 'utf8'));
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
});

test('parseFrontmatter reads properties and extractWikiLinks reads wikilinks', () => {
  const note = `---
title: Flow A
type: flow
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

test('extractWikiLinks ignores links inside HTML comments', () => {
  const note = '# X\nReal [[domains/Real]].\n<!-- 填:示例 [[repos/{repo}/submodules/X/上下文]] 不算链接 -->';
  assert.deepEqual(extractWikiLinks(note), ['domains/Real']);
});

test('parseFrontmatter supports CRLF line endings', () => {
  const note = [
    '---',
    'title: Windows Note',
    'type: flow',
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
repo: global
confidence: high
status: active
sources:
  - repos/a/src/domain.ts
---
# Domain A
`);
    await writeNote(kbRoot, 'repos/repo-a/flows/Flow A.md', `---
title: Flow A
type: flow
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
    const index = await buildIndex({ kbRoot });
    assert.equal(index.pages.length >= 2, true);
    const flow = index.pages.find((page) => page.relativePath === 'repos/repo-a/flows/Flow A.md');
    assert.deepEqual(flow.outgoingLinks.sort(), ['contracts/Contract A', 'domains/Domain A']);
    assert.deepEqual(index.incomingLinks.get('domains/Domain A.md'), ['repos/repo-a/flows/Flow A.md']);
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
});

test('lintKnowledgeBase reports missing required properties and orphan pages', async () => {
  const workspace = await makeTempWorkspace();
  const kbRoot = path.join(workspace, 'code-kb');
  try {
    await initKnowledgeBase({ kbRoot });
    await writeNote(kbRoot, 'repos/repo-a/flows/Broken.md', '# Broken\n');
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

test('lintKnowledgeBase reports missing template-required sections', async () => {
  const workspace = await makeTempWorkspace();
  const kbRoot = path.join(workspace, 'code-kb');
  try {
    await initKnowledgeBase({ kbRoot });
    // overview 页缺 `## 职责边界` 等模板必需 section。
    await writeNote(kbRoot, 'repos/svc/overview.md', `---
title: M
type: overview
repo: svc
created: 2026-06-25
updated: 2026-06-25
confidence: high
status: active
sources:
  - repos/svc/src/m.cpp:run()
---
# 模块：M
See [[contracts/X]].

## 仓库定位
负责编排。
`);
    const result = await lintKnowledgeBase({ kbRoot });
    assert.equal(
      result.issues.some((issue) => issue.type === 'template' && /职责边界/.test(issue.message)),
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
repo: global
confidence: high
status: active
sources:
  - repos/a/src/domain.ts
---
# Domain A
`);
    await writeNote(kbRoot, 'repos/repo-a/flows/Flow A.md', `---
title: Flow A
type: flow
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
    assert.deepEqual(links.incoming, ['repos/repo-a/flows/Flow A.md']);
    assert.deepEqual(links.outgoing, []);
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
});

test('searchKnowledgeBase ranks durable notes without generated markdown indexes', async () => {
  const workspace = await makeTempWorkspace();
  const kbRoot = path.join(workspace, 'code-kb');
  try {
    await initKnowledgeBase({ kbRoot });
    await writeNote(kbRoot, 'domains/Provisioning.md', `---
title: Service Provisioning
type: domain
repo: global
aliases:
  - 业务开通
confidence: high
status: active
sources:
  - repos/order-service/src/orders/create.ts:createOrder()
---
# Service Provisioning
业务开通负责创建订单、预占资源并触发下游履约。
`);

    const result = await searchKnowledgeBase({ kbRoot, query: '业务开通', limit: 3 });

    assert.equal(result.results[0].relativePath, 'domains/Provisioning.md');
    assert.equal(result.results[0].matches.some((match) => match.startsWith('aliases:')), true);
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

test('pipeline status runs against a temp kb', async () => {
  const kb = await mkdtemp(path.join(tmpdir(), 'kb-'));
  try {
    const { stdout } = await run(['pipeline', 'status', '--repo', 'R', '--kb-root', kb]);
    assert.match(stdout, /terrain/);
  } finally {
    await rm(kb, { recursive: true, force: true });
  }
});

test('pipeline next returns terrain instruction first', async () => {
  const kb = await mkdtemp(path.join(tmpdir(), 'kb-'));
  try {
    const { stdout } = await run(['pipeline', 'next', '--repo', 'R', '--kb-root', kb]);
    assert.match(stdout, /terrain/);
  } finally {
    await rm(kb, { recursive: true, force: true });
  }
});

test('pipeline next forwards --pipeline deep-analysis', async () => {
  const kb = await mkdtemp(path.join(tmpdir(), 'obsidian-kb-'));
  try {
    const { stdout } = await run(['pipeline', 'next', '--repo', 'R', '--pipeline', 'deep-analysis', '--topic', 'T', '--kb-root', kb]);
    assert.match(stdout, /call-tree/);
  } finally {
    await rm(kb, { recursive: true, force: true });
  }
});
