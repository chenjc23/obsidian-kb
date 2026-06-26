---
title: {{title}}
type: use-case
created: {{created}}
updated: {{updated}}
repo: global
sources:
  - <!-- 填:path:func() durable 证据,不带行号 -->
confidence: <!-- 填:high|medium|low -->
status: active
entry-point:
  - <!-- 填:repos/{repo}/.../x.ts:func();无则删本字段 -->
domain:
  - <!-- 填:涉及的业务域名 -->
actors:
  - <!-- 填:谁触发这个场景 -->
---

# 用例：{{title}}
> <!-- 填:目标 / actor / 触发方式,一句话讲清这个场景是什么 -->

## 前置条件
<!-- 填:触发前需满足的业务状态 -->

## 端到端编排
<!-- 填:有序步骤,每步链到 flow,跨仓处链对应 [[global/contracts/X]]
1. [[repos/{repo}/flows/下单]] —（经 [[global/contracts/CreateOrder]],跨仓）→
2. [[repos/{repo}/flows/资源分配]] -->

## 涉及业务域
<!-- 填:[[global/domains/订单域]] · [[global/domains/资源域]] -->

## 关键判定点 / 验收
<!-- 填:决定成败的分叉与验收标准 -->

## 风险链
<!-- 填:[[repos/{repo}/runtime-notes#某警示]] -->
