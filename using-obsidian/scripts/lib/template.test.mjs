import test from 'node:test';
import assert from 'node:assert/strict';
import { fillMechanical, requiredSections, targetPath, loadTemplate } from './template.mjs';

test('fillMechanical replaces all mechanical tokens', () => {
  const out = fillMechanical('# {{title}} {{repo}} {{created}} {{updated}}', { title: 'X', repo: 'r', date: '2026-06-25' });
  assert.equal(out, '# X r 2026-06-25 2026-06-25');
});

test('requiredSections lists ## headings minus optional', () => {
  // module template has 职责/公共接口/依赖（出）/被依赖（入·反向链接）/相关流程
  const secs = requiredSections('module');
  assert.ok(secs.includes('职责'));
  assert.ok(secs.includes('依赖（出）'));
});

test('targetPath maps type to kb-relative path', () => {
  assert.equal(targetPath('module', { repo: 'order-service', title: '订单编排' }), 'repos/order-service/modules/订单编排.md');
  assert.equal(targetPath('contract', { title: 'OrderPaid' }), 'contracts/OrderPaid.md');
  assert.equal(targetPath('coverage', {}), 'architecture/coverage.md');
  assert.equal(targetPath('use-case', { title: '服务开通' }), 'use-cases/服务开通.md');
  assert.equal(targetPath('flow', { repo: 'order-service', topic: '服务开通', flowFile: '主干流程' }), 'repos/order-service/flows/服务开通/主干流程.md');
});

test('loadTemplate returns text for known type and throws for unknown', () => {
  assert.match(loadTemplate('module'), /type: module/);
  assert.throws(() => loadTemplate('nope'));
});
