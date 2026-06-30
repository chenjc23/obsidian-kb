---
title: {{title}}
type: repo-usecase
created: {{created}}
updated: {{updated}}
repo: {{repo}}
sources:
  - <!-- 填:入口 path:func() durable 证据 -->
confidence: <!-- 填:high|medium|low -->
status: active
entry-point:
  - <!-- 填:path:func();无则删本字段 -->
domain:
  - <!-- 填:涉及的业务域名 -->
---

# 仓内行为场景：{{title}}
> <!-- 填:本仓内一个可独立理解的行为场景、触发者和结果 -->

## 触发条件
<!-- 填:谁触发、通过什么入口、需要什么前置状态 -->

## 场景步骤
<!-- 填:有序步骤,链到 [[repos/{repo}/flows/{主题}/主干流程]] 或仓内子模块 -->

## 涉及子模块
<!-- 填:[[repos/{repo}/submodules/{topic}/子模块设计]] -->

## 对外影响
<!-- 填:[[global/contracts/X]] · [[repos/{repo}/api-surface]] · [[repos/{repo}/api-depend]] -->
