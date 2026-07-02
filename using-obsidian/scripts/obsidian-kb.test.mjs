import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile, mkdir } from 'node:fs/promises';
import { existsSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
const execFileP = promisify(execFile);
const CLI = fileURLToPath(new URL('./obsidian-kb.mjs', import.meta.url));
async function run(args) { return execFileP('node', [CLI, ...args], { timeout: 15000 }); }
async function runIn(cwd, args) { return execFileP('node', [CLI, ...args], { cwd, timeout: 15000 }); }

import {
  resolveContext,
  initKnowledgeBase,
  collectMarkdownFiles,
  parseFrontmatter,
  extractWikiLinks,
  buildIndex,
  lintKnowledgeBase,
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

test('resolveContext uses cwd itself when cwd is code-kb', async () => {
  const workspace = await makeTempWorkspace();
  const kbRoot = path.join(workspace, 'code-kb');
  try {
    await mkdir(kbRoot, { recursive: true });
    const context = resolveContext({ cwd: kbRoot, args: [] });
    assert.equal(context.workspaceRoot, kbRoot);
    assert.equal(context.kbRoot, kbRoot);
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
});

test('resolve command locates kb-root deterministically', async () => {
  const kb = realpathSync(await mkdtemp(path.join(tmpdir(), 'kb-')));
  try {
    // 空目录、未指定 → default + found:false
    const def = JSON.parse((await runIn(kb, ['resolve', '--json'])).stdout);
    assert.equal(def.source, 'default');
    assert.equal(def.found, false);
    assert.equal(def.kbRoot, path.join(kb, 'code-kb'));
    // 显式路径 → source:explicit
    const explicit = JSON.parse((await runIn(kb, ['resolve', '--kb-root', 'foo', '--json'])).stdout);
    assert.equal(explicit.source, 'explicit');
    assert.equal(explicit.kbRoot, path.join(kb, 'foo'));
  } finally {
    await rm(kb, { recursive: true, force: true });
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

test('smoke: deep-analysis 六件串行,前件落盘才解锁下件(exists 闸门,不并行)', async () => {
  const kb = await mkdtemp(path.join(tmpdir(), 'kb-'));
  try {
    await run(['init', '--kb-root', kb]);
    const stOf = async (id) => JSON.parse((await run(['pipeline', 'status', '--repo', 'R',
      '--pipeline', 'deep-analysis', '--topic', 'T', '--kb-root', kb, '--json'])).stdout)
      .find((s) => s.id === id).state;

    // 串行链:初始只有 call-tree ready,后续成员全 blocked
    assert.equal(await stOf('call-tree'), 'ready');
    assert.equal(await stOf('branches'), 'blocked');

    const members = ['调用树', '主干流程', '分支主题', '跨边界数据流', '数据结构', '自查报告'];
    const ids = ['call-tree', 'main-flow', 'branches', 'cross-boundary', 'data-structures', 'self-check'];
    for (let i = 0; i < members.length; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      assert.equal(await stOf(ids[i]), 'ready', `${ids[i]} 应在前序落盘后才 ready`);
      // eslint-disable-next-line no-await-in-loop
      await writeFilledFromScaffold(kb, ['flow', '--repo', 'R', '--topic', 'T', '--member', members[i]]);
      // eslint-disable-next-line no-await-in-loop
      assert.equal(await stOf(ids[i]), 'done', `${ids[i]} 落盘后应 done`);
    }
  } finally {
    await rm(kb, { recursive: true, force: true });
  }
});

// 模拟 agent:从 scaffold 吐出的骨架里去占位后写入目标路径。
async function writeFilledFromScaffold(kb, args) {
  const { stdout } = await run(['scaffold', ...args, '--kb-root', kb, '--json']);
  const { skeletons } = JSON.parse(stdout);
  for (const sk of skeletons) {
    const filled = sk.content.replace(/<!--\s*填[\s\S]*?-->/g, '已填');
    const full = path.join(kb, sk.target);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, filled, 'utf8');
  }
}

test('scaffold emits skeleton without writing files', async () => {
  const kb = await mkdtemp(path.join(tmpdir(), 'kb-'));
  try {
    const { stdout } = await run(['scaffold', 'overview', '--repo', 'R', '--title', 'R', '--kb-root', kb, '--json']);
    const res = JSON.parse(stdout);
    assert.equal(res.skeletons.length, 1);
    assert.equal(res.skeletons[0].target, 'repos/R/overview.md');
    assert.match(res.skeletons[0].content, /title: R/);
    assert.equal(existsSync(path.join(kb, 'repos/R/overview.md')), false);
    // 默认输出:目标路径 + 逐行原样骨架正文(非转义 JSON),供 agent 直接写入。
    const plain = await run(['scaffold', 'overview', '--repo', 'R', '--title', 'R', '--kb-root', kb]);
    assert.match(plain.stdout, /repos\/R\/overview\.md/);
    const lines = plain.stdout.split('\n');
    assert.ok(lines.includes('title: R'), '骨架正文须逐行原样输出');
  } finally {
    await rm(kb, { recursive: true, force: true });
  }
});

test('smoke: init → scaffold terrain pages → pipeline status advances', async () => {
  const kb = await mkdtemp(path.join(tmpdir(), 'kb-'));
  try {
    await run(['init', '--kb-root', kb]);

    // terrain 未做:status 里 terrain=ready,submodules=blocked
    const before = await run(['pipeline', 'status', '--repo', 'R', '--kb-root', kb, '--json']);
    const st1 = JSON.parse(before.stdout);
    assert.equal(st1.find((s) => s.id === 'terrain').state, 'ready');
    assert.equal(st1.find((s) => s.id === 'submodules').state, 'blocked');

    // 生成 terrain 两页:scaffold 吐骨架 → 去占位 → 写入(模拟 agent)
    await writeFilledFromScaffold(kb, ['overview', '--repo', 'R', '--title', 'R']);
    await writeFilledFromScaffold(kb, ['architecture', '--repo', 'R', '--title', 'R']);

    const after = await run(['pipeline', 'status', '--repo', 'R', '--kb-root', kb, '--json']);
    const st2 = JSON.parse(after.stdout);
    assert.equal(st2.find((s) => s.id === 'terrain').state, 'done');
    assert.equal(st2.find((s) => s.id === 'submodules').state, 'ready');

    // supplements:8 页全生成才 done(exists 闸门,不适用页也须生成)
    assert.equal(st2.find((s) => s.id === 'supplements').state, 'ready');
    for (const t of ['glossary', 'api-surface', 'api-depend', 'data-model', 'specifications', 'constraints', 'resource-analysis', 'human-interfaces']) {
      await writeFilledFromScaffold(kb, [t, '--repo', 'R', '--title', 'R']);
    }
    const st3 = JSON.parse((await run(['pipeline', 'status', '--repo', 'R', '--kb-root', kb, '--json'])).stdout);
    assert.equal(st3.find((s) => s.id === 'supplements').state, 'done');
  } finally {
    await rm(kb, { recursive: true, force: true });
  }
});
