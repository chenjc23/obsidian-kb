import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { scaffoldPage, scaffoldPartialContract } from './scaffold.mjs';

test('scaffoldPage writes an overview page with filled mechanical fields', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'kb-'));
  const res = await scaffoldPage({ kbRoot: root, type: 'overview', repo: 'order-service', title: '订单服务' });
  assert.deepEqual(res.created, ['repos/order-service/overview.md']);
  const txt = await readFile(path.join(root, res.created[0]), 'utf8');
  assert.match(txt, /title: 订单服务/);
  assert.match(txt, /repo: order-service/);
  assert.doesNotMatch(txt, /\{\{/); // 无残留机械标记
});

test('scaffoldPage flow generates six files', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'kb-'));
  const res = await scaffoldPage({ kbRoot: root, type: 'flow', repo: 'r', topic: 'T' });
  assert.equal(res.created.length, 6);
});

test('scaffoldPage submodule generates the seven member files', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'kb-'));
  const res = await scaffoldPage({ kbRoot: root, type: 'submodule', repo: 'r', topic: 'T' });
  const expected = [
    'repos/r/submodules/T/上下文.md',
    'repos/r/submodules/T/功能.md',
    'repos/r/submodules/T/数据结构.md',
    'repos/r/submodules/T/特性耦合.md',
    'repos/r/submodules/T/状态迁移规则.md',
    'repos/r/submodules/T/接口.md',
    'repos/r/submodules/T/规格约束.md',
  ].sort();
  assert.deepEqual(res.created.sort(), expected);
});

test('scaffoldPartialContract creates page and appends coverage row atomically', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'kb-'));
  const res = await scaffoldPartialContract({ kbRoot: root, title: 'OrderPaid', side: 'producer', known: 'order-service', evidence: 'src/mq/p.cpp:emit()' });
  const c = await readFile(path.join(root, 'global/contracts/OrderPaid.md'), 'utf8');
  assert.match(c, /status: partial/);
  // 已知一端必须被填入（不能停在 <!-- 填 --> 占位）；未知一端保持占位。
  assert.match(c, /producer:\r?\n {2}- order-service/);
  assert.match(c, /consumer:\r?\n {2}- <!-- 填:/);
  const cov = await readFile(path.join(root, 'global/architecture/coverage.md'), 'utf8');
  assert.match(cov, /OrderPaid/);
  assert.match(cov, /待接合/);
  assert.ok(res.coverageRow);
});

test('scaffoldPage refuses existing file without force', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'kb-'));
  await scaffoldPage({ kbRoot: root, type: 'repo-usecase', repo: 'r', title: 'M' });
  const res = await scaffoldPage({ kbRoot: root, type: 'repo-usecase', repo: 'r', title: 'M' });
  assert.equal(res.skipped.length, 1);
  assert.equal(res.created.length, 0);
});
