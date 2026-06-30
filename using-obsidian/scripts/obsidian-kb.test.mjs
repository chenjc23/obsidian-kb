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
  inspectCandidateFlow,
  markCandidateFlowDone,
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

test('resolveContext uses cwd when it looks like a knowledge base root', async () => {
  const workspace = await makeTempWorkspace();
  try {
    await initKnowledgeBase({ kbRoot: workspace });
    const context = resolveContext({ cwd: workspace, args: ['--mode', 'read'] });

    assert.equal(context.kbRoot, workspace);
    assert.equal(context.resolution.reason, 'cwd');
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
});

test('resolveContext discovers the nearest ancestor code-kb', async () => {
  const workspace = await makeTempWorkspace();
  const kbRoot = path.join(workspace, 'code-kb');
  const nested = path.join(workspace, 'packages', 'service');
  try {
    await initKnowledgeBase({ kbRoot });
    await mkdir(nested, { recursive: true });

    const context = resolveContext({ cwd: nested, args: ['--mode', 'read'] });

    assert.equal(context.kbRoot, kbRoot);
    assert.equal(context.resolution.reason, 'ancestor-code-kb');
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
});

test('resolveContext scores one-level code-kb candidates by knowledge-base shape', async () => {
  const workspace = await makeTempWorkspace();
  const shallow = path.join(workspace, 'alpha', 'code-kb');
  const shaped = path.join(workspace, 'beta', 'code-kb');
  try {
    await mkdir(path.join(shallow, 'repos'), { recursive: true });
    await initKnowledgeBase({ kbRoot: shaped });

    const context = resolveContext({ cwd: workspace, args: ['--mode', 'read'] });

    assert.equal(context.kbRoot, shaped);
    assert.equal(context.resolution.reason, 'child-code-kb');
    assert.deepEqual(
      context.resolution.candidates.map((candidate) => path.basename(path.dirname(candidate.path))),
      ['beta', 'alpha'],
    );
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
});

test('resolveContext does not fabricate kbRoot in read mode', async () => {
  const workspace = await makeTempWorkspace();
  try {
    const context = resolveContext({ cwd: workspace, args: ['--mode', 'read'] });

    assert.equal(context.kbRoot, undefined);
    assert.equal(context.resolution.reason, 'not-found');
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
  const note = '# X\nReal [[domains/Real]].\n<!-- 填:示例 [[repos/{repo}/modules/X]] 不算链接 -->';
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
    const index = await buildIndex({ kbRoot, writeIndexes: false });
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
    // module 页缺 `## 依赖（出）` 等模板必需 section。
    await writeNote(kbRoot, 'repos/svc/modules/M.md', `---
title: M
type: module
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

## 职责
负责编排。
`);
    const result = await lintKnowledgeBase({ kbRoot });
    assert.equal(
      result.issues.some((issue) => issue.type === 'template' && /依赖（出）/.test(issue.message)),
      true,
    );
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
});

test('lintKnowledgeBase reports link-contract and partial coverage issues', async () => {
  const workspace = await makeTempWorkspace();
  const kbRoot = path.join(workspace, 'code-kb');
  try {
    await initKnowledgeBase({ kbRoot });
    await writeNote(kbRoot, 'global/contracts/OrderPaid.md', `---
title: OrderPaid
type: contract
repo: global
created: 2026-06-25
updated: 2026-06-25
confidence: high
status: partial
sources:
  - repos/order-service/src/pay.ts:emit()
producer:
  - order-service
consumer: []
---
# OrderPaid
Producer [[repos/order-service/modules/支付]].
`);
    await writeNote(kbRoot, 'repos/order-service/modules/支付.md', `---
title: 支付
type: module
repo: order-service
created: 2026-06-25
updated: 2026-06-25
confidence: high
status: active
sources:
  - repos/order-service/src/pay.ts:emit()
depends-on: []
---
# 支付
`);

    const result = await lintKnowledgeBase({ kbRoot });

    assert.equal(
      result.issues.some((issue) => issue.type === 'partial-coverage' && issue.page === 'global/contracts/OrderPaid.md'),
      true,
    );
    assert.equal(
      result.issues.some((issue) => issue.type === 'reciprocal-link' && issue.page === 'global/contracts/OrderPaid.md'),
      true,
    );
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
});

test('lintKnowledgeBase reports required relation metadata and contract completeness', async () => {
  const workspace = await makeTempWorkspace();
  const kbRoot = path.join(workspace, 'code-kb');
  try {
    await initKnowledgeBase({ kbRoot });
    await writeNote(kbRoot, 'global/contracts/ActiveButOneSided.md', `---
title: ActiveButOneSided
type: contract
repo: global
created: 2026-06-25
updated: 2026-06-25
confidence: high
status: active
sources:
  - repos/a/src/api.ts:send()
producer:
  - a
consumer: []
---
# ActiveButOneSided
`);
    await writeNote(kbRoot, 'repos/a/flows/F.md', `---
title: F
type: flow
repo: a
created: 2026-06-25
updated: 2026-06-25
confidence: high
status: active
sources:
  - repos/a/src/main.ts:start()
domain: []
---
# F
`);

    const result = await lintKnowledgeBase({ kbRoot });

    assert.equal(
      result.issues.some((issue) => issue.type === 'contract-linkage' && /missing consumer/.test(issue.message)),
      true,
    );
    assert.equal(
      result.issues.some((issue) => issue.type === 'relation-metadata' && /entry-point/.test(issue.message)),
      true,
    );
    assert.equal(
      result.issues.some((issue) => issue.type === 'relation-metadata' && /related-contracts/.test(issue.message)),
      true,
    );
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
});

test('inspectCandidateFlow returns next flow and state issues', async () => {
  const workspace = await makeTempWorkspace();
  const kbRoot = path.join(workspace, 'code-kb');
  try {
    await initKnowledgeBase({ kbRoot });
    await writeNote(kbRoot, 'repos/svc/candidate-flow.md', `---
title: svc flows
type: candidate
repo: svc
created: 2026-06-25
updated: 2026-06-25
confidence: medium
status: active
sources: []
---
# svc 已识别流程清单

## Deep Analysis 流程清单
| 分析顺序 | 流程名称 | 入口/接口 | 触发方式 | 涉及仓库/模块 | 是否跨消息边界 | 风险等级 | 推荐原因 | 证据链 | 可达性 | confidence | 状态 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 创建订单 | create() | HTTP | svc/order | 否 | high | 核心 | 注册/分发/实现 | target | high | 已深挖 |
| 3 | 支付回调 | onPaid() | MQ | svc/pay | 是 | high | 跨边界 | 注册/分发/实现 | target | high | 待深挖 |
| 4 | 退款 | refund() | HTTP | svc/pay | 否 | medium | 风险 | 注册/分发/实现 | target | medium |  |
`);

    const result = await inspectCandidateFlow({ kbRoot, repo: 'svc' });
    const lint = await lintKnowledgeBase({ kbRoot });

    assert.equal(result.allDone, false);
    assert.equal(result.nextFlow.name, '支付回调');
    assert.equal(result.issues.some((issue) => issue.type === 'order-gap'), true);
    assert.equal(result.issues.some((issue) => issue.type === 'invalid-status'), true);
    assert.equal(lint.issues.some((issue) => issue.type === 'candidate-order-gap'), true);
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
});

test('markCandidateFlowDone updates a queued row', async () => {
  const workspace = await makeTempWorkspace();
  const kbRoot = path.join(workspace, 'code-kb');
  try {
    await initKnowledgeBase({ kbRoot });
    await writeNote(kbRoot, 'repos/svc/candidate-flow.md', `---
title: svc flows
type: candidate
repo: svc
created: 2026-06-25
updated: 2026-06-25
confidence: medium
status: active
sources: []
---
# svc 已识别流程清单

## Deep Analysis 流程清单
| 分析顺序 | 流程名称 | 入口/接口 | 触发方式 | 涉及仓库/模块 | 是否跨消息边界 | 风险等级 | 推荐原因 | 证据链 | 可达性 | confidence | 状态 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 创建订单 | create() | HTTP | svc/order | 否 | high | 核心 | 注册/分发/实现 | target | high | 待深挖 |
`);

    const update = await markCandidateFlowDone({ kbRoot, repo: 'svc', flowName: '创建订单' });
    const result = await inspectCandidateFlow({ kbRoot, repo: 'svc' });

    assert.equal(update.updated, true);
    assert.equal(result.allDone, true);
    assert.equal(result.flows[0].status, '已深挖');
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
});

test('lintKnowledgeBase reports deep flow folder completeness issues', async () => {
  const workspace = await makeTempWorkspace();
  const kbRoot = path.join(workspace, 'code-kb');
  try {
    await initKnowledgeBase({ kbRoot });
    await writeNote(kbRoot, 'repos/svc/flows/开通/调用树.md', `---
title: 开通
type: flow
repo: svc
created: 2026-06-25
updated: 2026-06-25
confidence: high
status: active
sources:
  - repos/svc/src/main.ts:start()
entry-point:
  - repos/svc/src/main.ts:start()
related-contracts: []
---
# 调用树：开通

## 调用树
- start() ... 等
`);

    const result = await lintKnowledgeBase({ kbRoot });

    assert.equal(
      result.issues.some((issue) => issue.type === 'flow-folder' && /主干流程/.test(issue.message)),
      true,
    );
    assert.equal(
      result.issues.some((issue) => issue.type === 'flow-placeholder' || issue.type === 'flow-shortcut'),
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
