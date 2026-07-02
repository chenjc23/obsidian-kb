import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { resolveKbRoot } from './kb-root.mjs';

async function tmp() {
  return mkdtemp(path.join(tmpdir(), 'kbr-'));
}

// 建一个「像 kb-root」的目录:含 index.md/log.md/repos/。
async function seedKbRoot(dir) {
  await mkdir(path.join(dir, 'repos'), { recursive: true });
  await mkdir(path.join(dir, 'global'), { recursive: true });
  await writeFile(path.join(dir, 'index.md'), '# index\n', 'utf8');
  await writeFile(path.join(dir, 'log.md'), '# log\n', 'utf8');
}

test('explicit path wins, source=explicit', async () => {
  const root = await tmp();
  const res = resolveKbRoot({ cwd: root, explicit: 'my-kb' });
  assert.equal(res.kbRoot, path.join(root, 'my-kb'));
  assert.equal(res.source, 'explicit');
});

test('cwd itself is a kb-root, source=cwd', async () => {
  const root = await tmp();
  await seedKbRoot(root);
  const res = resolveKbRoot({ cwd: root });
  assert.equal(res.kbRoot, root);
  assert.equal(res.found, true);
  assert.equal(res.source, 'cwd');
});

test('cwd/code-kb exists, source=cwd-child', async () => {
  const root = await tmp();
  await mkdir(path.join(root, 'code-kb'), { recursive: true });
  const res = resolveKbRoot({ cwd: root });
  assert.equal(res.kbRoot, path.join(root, 'code-kb'));
  assert.equal(res.found, true);
  assert.equal(res.source, 'cwd-child');
});

test('nearest ancestor code-kb, source=ancestor', async () => {
  const root = await tmp();
  await mkdir(path.join(root, 'code-kb'), { recursive: true });
  const deep = path.join(root, 'a', 'b');
  await mkdir(deep, { recursive: true });
  const res = resolveKbRoot({ cwd: deep });
  assert.equal(res.kbRoot, path.join(root, 'code-kb'));
  assert.equal(res.found, true);
  assert.equal(res.source, 'ancestor');
});

test('single kb-root-like child directory, source=workspace-child', async () => {
  const root = await tmp();
  const child = path.join(root, 'proj-a-kb');
  await mkdir(child, { recursive: true });
  await seedKbRoot(child);
  const res = resolveKbRoot({ cwd: root });
  assert.equal(res.kbRoot, child);
  assert.equal(res.found, true);
  assert.equal(res.source, 'workspace-child');
});

test('multiple child candidates: pick the most kb-root-like', async () => {
  const root = await tmp();
  const strong = path.join(root, 'strong-kb');
  const weak = path.join(root, 'weak');
  await seedKbRoot(strong);                 // 分数高:index+log+repos+global
  await mkdir(path.join(weak, 'repos'), { recursive: true }); // 分数低:只 repos
  const res = resolveKbRoot({ cwd: root });
  assert.equal(res.kbRoot, strong);
  assert.equal(res.found, true);
});

test('tie between candidates → found:false, source=ambiguous, lists candidates', async () => {
  const root = await tmp();
  const a = path.join(root, 'a-kb');
  const b = path.join(root, 'b-kb');
  await seedKbRoot(a);
  await seedKbRoot(b);
  const res = resolveKbRoot({ cwd: root });
  assert.equal(res.found, false);
  assert.equal(res.source, 'ambiguous');
  assert.deepEqual(res.candidates.sort(), [a, b].sort());
});

test('nothing found → found:false, source=default, kbRoot=cwd/code-kb', async () => {
  const root = await tmp();
  const res = resolveKbRoot({ cwd: root });
  assert.equal(res.found, false);
  assert.equal(res.source, 'default');
  assert.equal(res.kbRoot, path.join(root, 'code-kb'));
});
