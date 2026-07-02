import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { scaffoldPage, scaffoldPartialContract } from './scaffold.mjs';

test('scaffoldPage emits an overview skeleton without writing to disk', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'kb-'));
  const res = await scaffoldPage({ type: 'overview', repo: 'order-service', title: '订单服务' });
  assert.equal(res.skeletons.length, 1);
  const sk = res.skeletons[0];
  assert.equal(sk.target, 'repos/order-service/overview.md');
  assert.match(sk.content, /title: 订单服务/);
  assert.match(sk.content, /repo: order-service/);
  assert.doesNotMatch(sk.content, /\{\{/); // 无残留机械标记
  // 不落盘：目标文件不应存在
  assert.equal(existsSync(path.join(root, sk.target)), false);
  // kbRoot 保持空
  assert.equal((await readdir(root)).length, 0);
});

test('scaffoldPage flow --member emits only that member skeleton', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'kb-'));
  const res = await scaffoldPage({ type: 'flow', repo: 'r', topic: 'T', member: '主干流程' });
  assert.equal(res.skeletons.length, 1);
  assert.equal(res.skeletons[0].target, 'repos/r/flows/T/主干流程.md');
  assert.equal((await readdir(root)).length, 0);
});

test('scaffoldPage submodule --member emits only that member skeleton', async () => {
  const res = await scaffoldPage({ type: 'submodule', repo: 'r', topic: 'T', member: 'overview' });
  assert.equal(res.skeletons.length, 1);
  assert.equal(res.skeletons[0].target, 'repos/r/submodules/T/overview.md');
});

test('scaffoldPage composite type without member throws', async () => {
  await assert.rejects(
    () => scaffoldPage({ type: 'submodule', repo: 'r', topic: 'T' }),
    /成员|member/,
  );
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
