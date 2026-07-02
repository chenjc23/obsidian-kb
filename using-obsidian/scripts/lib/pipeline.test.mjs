import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile as readF, writeFile as writeF, mkdir as mkdirF } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { tracksAllComplete, fillPlaceholders, readState, markStageDone, stageDone, pipelineStatus, pipelineNext, getPipeline } from './pipeline.mjs';
import { loadRegistry } from './registry.mjs';

const LEDGER_HEAD = `# R 已识别流程清单
## Deep Analysis 流程清单
| 分析顺序 | 流程名称 | 入口/接口 | 触发方式 | 涉及仓库/模块 | 是否跨消息边界 | 风险等级 | 推荐原因 | 证据链 | 可达性 | confidence | 状态 |
|---|---|---|---|---|---|---|---|---|---|---|---|`;

test('tracksAllComplete: all rows complete → true', () => {
  const text = `${LEDGER_HEAD}
| 1 | flowA | e | t | R | 否 | 高 | r | c | target | high | 已深挖 |
| 2 | flowB | e | t | R | 否 | 中 | r | c | target | high | 已深挖 |`;
  assert.equal(tracksAllComplete(text, '已深挖'), true);
});

test('tracksAllComplete: one row pending → false', () => {
  const text = `${LEDGER_HEAD}
| 1 | flowA | e | t | R | 否 | 高 | r | c | target | high | 已深挖 |
| 2 | flowB | e | t | R | 否 | 中 | r | c | target | high | 待深挖 |`;
  assert.equal(tracksAllComplete(text, '已深挖'), false);
});

test('tracksAllComplete: empty ledger (only placeholder comment) → true', () => {
  const text = `${LEDGER_HEAD}
<!-- 填:每个识别到的流程一行 -->`;
  assert.equal(tracksAllComplete(text, '已深挖'), true);
});

test('fillPlaceholders replaces repo and topic', () => {
  assert.equal(fillPlaceholders('repos/{repo}/flows/{topic}/x.md', { repo: 'R', topic: 'T' }),
    'repos/R/flows/T/x.md');
  assert.equal(fillPlaceholders('repos/{repo}/overview.md', { repo: 'R' }), 'repos/R/overview.md');
});

test('readState returns {} when no state file', async () => {
  const kb = await mkdtemp(path.join(tmpdir(), 'kb-'));
  assert.deepEqual(await readState(kb), {});
});

test('markStageDone then readState round-trips', async () => {
  const kb = await mkdtemp(path.join(tmpdir(), 'kb-'));
  const pipeline = twoStagePipeline();
  await markStageDone(kb, 'ingest', 'supplements', { repo: 'R', pipeline });
  const state = await readState(kb, { pipelineName: 'ingest', repo: 'R', pipeline });
  assert.equal(state.ingest.supplements, true);
  const raw = await readF(path.join(kb, '.obsidian', 'pipeline-state.json'), 'utf8');
  assert.match(raw, /supplements/);
});

async function seedFile(kb, rel, content) {
  const full = path.join(kb, rel);
  await mkdirF(path.dirname(full), { recursive: true });
  await writeF(full, content, 'utf8');
}

test('stageDone exists: true when produces files exist', async () => {
  const kb = await mkdtemp(path.join(tmpdir(), 'kb-'));
  await seedFile(kb, 'repos/R/overview.md', '# ok\n内容\n');
  const stage = { id: 'terrain', produces: ['repos/{repo}/overview.md'], done: { exists: 'produces' } };
  assert.equal(await stageDone(stage, { kbRoot: kb, repo: 'R', pipelineName: 'ingest', state: {} }), true);
});

test('stageDone exists: true when 填 marker remains', async () => {
  const kb = await mkdtemp(path.join(tmpdir(), 'kb-'));
  await seedFile(kb, 'repos/R/overview.md', '# ok\n<!-- 填:定位 -->\n');
  const stage = { id: 'terrain', produces: ['repos/{repo}/overview.md'], done: { exists: 'produces' } };
  assert.equal(await stageDone(stage, { kbRoot: kb, repo: 'R', pipelineName: 'ingest', state: {} }), true);
});

test('stageDone exists: false when produces file missing', async () => {
  const kb = await mkdtemp(path.join(tmpdir(), 'kb-'));
  const stage = { id: 'terrain', produces: ['repos/{repo}/overview.md'], done: { exists: 'produces' } };
  assert.equal(await stageDone(stage, { kbRoot: kb, repo: 'R', pipelineName: 'ingest', state: {} }), false);
});

test('stageDone exists: directory produces (trailing slash) checks dir', async () => {
  const kb = await mkdtemp(path.join(tmpdir(), 'kb-'));
  await seedFile(kb, 'repos/R/submodules/x/上下文.md', '# x\n');
  const stage = { id: 'submodules', produces: ['repos/{repo}/submodules/'], done: { exists: 'produces' } };
  assert.equal(await stageDone(stage, { kbRoot: kb, repo: 'R', pipelineName: 'ingest', state: {} }), true);
});

test('stageDone tracksAllComplete reads tracks file', async () => {
  const kb = await mkdtemp(path.join(tmpdir(), 'kb-'));
  await seedFile(kb, 'repos/R/candidate-flow.md',
    '| 分析顺序 | 状态 |\n|---|---|\n| 1 | 已深挖 |\n');
  const stage = { id: 'deep-dive', tracks: 'repos/{repo}/candidate-flow.md', done: { tracksAllComplete: '已深挖' } };
  assert.equal(await stageDone(stage, { kbRoot: kb, repo: 'R', pipelineName: 'ingest', state: {} }), true);
});

test('stageDone instructionSelfReport reads state', async () => {
  const kb = await mkdtemp(path.join(tmpdir(), 'kb-'));
  const stage = { id: 'backlinks', done: { instructionSelfReport: true } };
  assert.equal(await stageDone(stage, { kbRoot: kb, repo: 'R', pipelineName: 'ingest', state: {} }), false);
  assert.equal(await stageDone(stage, { kbRoot: kb, repo: 'R', pipelineName: 'ingest', state: { ingest: { backlinks: true } } }), true);
});

test('stageDone exists: empty directory produces → false', async () => {
  const kb = await mkdtemp(path.join(tmpdir(), 'kb-'));
  await mkdirF(path.join(kb, 'repos/R/submodules'), { recursive: true });
  const stage = { id: 'submodules', produces: ['repos/{repo}/submodules/'], done: { exists: 'produces' } };
  assert.equal(await stageDone(stage, { kbRoot: kb, repo: 'R', pipelineName: 'ingest', state: {} }), false);
});

test('stageDone: produces present but no done field, file missing → false', async () => {
  const kb = await mkdtemp(path.join(tmpdir(), 'kb-'));
  const stage = { id: 'x', produces: ['repos/{repo}/x.md'] };
  assert.equal(await stageDone(stage, { kbRoot: kb, repo: 'R', pipelineName: 'ingest', state: {} }), false);
});

function twoStagePipeline() {
  return {
    description: 'test',
    stages: [
      { id: 'a', produces: ['repos/{repo}/a.md'], requires: [], done: { exists: 'produces' } },
      { id: 'b', produces: ['repos/{repo}/b.md'], requires: ['a'], done: { exists: 'produces' } },
    ],
  };
}

test('pipelineStatus: nothing done → a ready, b blocked', async () => {
  const kb = await mkdtemp(path.join(tmpdir(), 'kb-'));
  const st = await pipelineStatus(twoStagePipeline(), { kbRoot: kb, repo: 'R', pipelineName: 'ingest' });
  assert.deepEqual(st, [{ id: 'a', state: 'ready' }, { id: 'b', state: 'blocked' }]);
});

test('pipelineStatus: a done → b ready', async () => {
  const kb = await mkdtemp(path.join(tmpdir(), 'kb-'));
  await seedFile(kb, 'repos/R/a.md', '# a\n');
  const st = await pipelineStatus(twoStagePipeline(), { kbRoot: kb, repo: 'R', pipelineName: 'ingest' });
  assert.deepEqual(st, [{ id: 'a', state: 'done' }, { id: 'b', state: 'ready' }]);
});

function selfReportPipeline() {
  return {
    description: 'test',
    stages: [
      { id: 'review', requires: [], done: { instructionSelfReport: true } },
    ],
  };
}

test('pipelineStatus reuses self-report state for the same repo', async () => {
  const kb = await mkdtemp(path.join(tmpdir(), 'kb-'));
  const pipeline = selfReportPipeline();
  await markStageDone(kb, 'ingest', 'review', { repo: 'R', pipeline });
  const st = await pipelineStatus(pipeline, { kbRoot: kb, repo: 'R', pipelineName: 'ingest' });
  assert.deepEqual(st, [{ id: 'review', state: 'done' }]);
});

test('pipelineStatus ignores self-report state from a different repo', async () => {
  const kb = await mkdtemp(path.join(tmpdir(), 'kb-'));
  const pipeline = selfReportPipeline();
  await markStageDone(kb, 'ingest', 'review', { repo: 'R1', pipeline });
  const st = await pipelineStatus(pipeline, { kbRoot: kb, repo: 'R2', pipelineName: 'ingest' });
  assert.deepEqual(st, [{ id: 'review', state: 'ready' }]);
});

test('pipelineStatus ignores self-report state when pipeline shape changes', async () => {
  const kb = await mkdtemp(path.join(tmpdir(), 'kb-'));
  const pipeline = selfReportPipeline();
  await markStageDone(kb, 'ingest', 'review', { repo: 'R', pipeline });
  const changedPipeline = {
    description: 'test',
    stages: [
      { id: 'review', requires: ['new-prerequisite'], done: { instructionSelfReport: true } },
    ],
  };
  const st = await pipelineStatus(changedPipeline, { kbRoot: kb, repo: 'R', pipelineName: 'ingest' });
  assert.deepEqual(st, [{ id: 'review', state: 'blocked' }]);
});

test('pipelineNext returns first ready stage with instruction body', async () => {
  const kb = await mkdtemp(path.join(tmpdir(), 'kb-'));
  const pipe = twoStagePipeline();
  pipe.stages[0].instruction = 'pipelines/ingest/terrain.md';
  // instruction 正文从真实 authoring 目录读;terrain.md 由 P3 建。此处用不依赖文件的断言:
  const nx = await pipelineNext(pipe, { kbRoot: kb, repo: 'R', pipelineName: 'ingest' });
  assert.equal(nx.id, 'a');
  assert.ok('instruction' in nx);
});

test('pipelineNext returns done when all stages complete', async () => {
  const kb = await mkdtemp(path.join(tmpdir(), 'kb-'));
  await seedFile(kb, 'repos/R/a.md', '# a\n');
  await seedFile(kb, 'repos/R/b.md', '# b\n');
  const nx = await pipelineNext(twoStagePipeline(), { kbRoot: kb, repo: 'R', pipelineName: 'ingest' });
  assert.deepEqual(nx, { done: true });
});

test('getPipeline throws on unknown name', () => {
  loadRegistry({ force: true }); // 真实 registry;P3 后含 ingest/deep-analysis
  assert.throws(() => getPipeline('nope'), /未知 pipeline/);
});
