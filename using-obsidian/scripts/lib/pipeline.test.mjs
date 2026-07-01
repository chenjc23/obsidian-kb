import test from 'node:test';
import assert from 'node:assert/strict';
import { tracksAllComplete } from './pipeline.mjs';

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
