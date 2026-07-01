import test from 'node:test';
import assert from 'node:assert/strict';
import { fillMechanical, requiredSections, targetPath, loadTemplate } from './template.mjs';

test('fillMechanical replaces all mechanical tokens', () => {
  const out = fillMechanical('# {{title}} {{repo}} {{created}} {{updated}}', { title: 'X', repo: 'r', date: '2026-06-25' });
  assert.equal(out, '# X r 2026-06-25 2026-06-25');
});

test('requiredSections lists ## headings minus optional', () => {
  const secs = requiredSections('overview');
  assert.ok(secs.includes('仓库定位'));
  assert.ok(secs.includes('职责边界'));
});

test('targetPath maps type to kb-relative path', () => {
  assert.equal(targetPath('overview', { repo: 'order-service' }), 'repos/order-service/overview.md');
  assert.equal(targetPath('contract', { title: 'OrderPaid' }), 'global/contracts/OrderPaid.md');
  assert.equal(targetPath('coverage', {}), 'global/architecture/coverage.md');
  assert.equal(targetPath('use-case', { title: '服务开通' }), 'global/use-cases/服务开通.md');
  assert.equal(targetPath('repo-usecase', { repo: 'order-service', title: '服务开通' }), 'repos/order-service/usecases/服务开通.md');
  assert.equal(targetPath('submodule', { repo: 'order-service', topic: '订单编排', member: '上下文' }), 'repos/order-service/submodules/订单编排/上下文.md');
  assert.equal(targetPath('flow', { repo: 'order-service', topic: '服务开通', flowFile: '主干流程' }), 'repos/order-service/flows/服务开通/主干流程.md');
});

test('loadTemplate returns text for known type and throws for unknown', () => {
  assert.match(loadTemplate('overview'), /type: overview/);
  assert.throws(() => loadTemplate('nope'));
});
