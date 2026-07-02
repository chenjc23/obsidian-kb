---
title: {{title}}
type: submodule
created: {{created}}
updated: {{updated}}
repo: {{repo}}
sources:
  - <!-- 填:path:func() durable 证据,不带行号 -->
confidence: <!-- 填:high|medium|low -->
status: active
---

# 接口：{{title}}
> <!-- 填:一句话概括子模块对外提供的接口 -->

## 对外接口
| 接口 | 签名/协议 | 职责 | 入参 | 出参 | 关联契约 |
|---|---|---|---|---|---|
<!-- 填:每个对外暴露的接口/入口一行,内部 helper 不列——
- 接口:函数/方法/路由/消息名,保留源码标识符原文
- 签名/协议:C++ 签名或 HTTP/RPC/MQ 协议;线程/重入约束在此点名,细节归 [[repos/{repo}/submodules/{topic}/constrains]]
- 入参/出参:关键参数与返回,所有权/生命周期语义标出
- 关联契约:跨边界接口链 [[global/contracts/X]],纯内部接口留空 -->

## 调用方
<!-- 填:谁调用这些接口,逐条反向链接——
- 本仓:链 [[repos/{repo}/submodules/{topic}/overview]] 或 [[repos/{repo}/flows/{主题}/主干流程]]
- 跨仓:经契约的链 [[global/contracts/X]] 对端
暂无已知调用方则留空,不编造。 -->
