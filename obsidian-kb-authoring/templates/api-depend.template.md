---
title: {{title}}
type: api-depend
created: {{created}}
updated: {{updated}}
repo: {{repo}}
sources:
  - <!-- 填:调用点 path:func() durable 证据 -->
confidence: <!-- 填:high|medium|low -->
status: active
---

# {{repo}} 外部接口依赖
> <!-- 填:本仓依赖哪些外部接口、协议或消息,以及失败会影响什么 -->

## 外部接口依赖
| 依赖对象 | 协议 | 调用入口 | 关联契约 | 失败影响 |
|---|---|---|---|---|
<!-- 填:每个外部依赖一行;跨边界的链 [[global/contracts/X]] -->

## 调用约束
<!-- 填:超时、重试、幂等、限流、认证、版本兼容、顺序要求 -->

## 相关流程
<!-- 填:[[repos/{repo}/flows/{主题}/跨边界数据流]] -->
