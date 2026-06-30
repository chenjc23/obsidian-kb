---
title: {{title}}
type: resource-analysis
created: {{created}}
updated: {{updated}}
repo: {{repo}}
sources:
  - <!-- 填:资源使用证据 path:func() / 配置 / profiling 文档 -->
confidence: <!-- 填:high|medium|low -->
status: active
---

# {{repo}} 资源占用分析
> <!-- 填:本仓主要 CPU/内存/IO/连接/线程/队列占用来源和风险 -->

## 资源热点
| 资源 | 来源 | 触发条件 | 上限/估算 | 风险 |
|---|---|---|---|---|
<!-- 填:CPU、内存、磁盘、网络、线程、连接、队列等 -->

## 容量与退化
<!-- 填:容量上限、背压、限流、降级、缓存淘汰、失败保护 -->

## 关联流程
<!-- 填:[[repos/{repo}/flows/{主题}/主干流程]] -->
