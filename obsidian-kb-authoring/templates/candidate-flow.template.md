---
title: {{title}}
type: candidate
created: {{created}}
updated: {{updated}}
repo: {{repo}}
sources: []
confidence: medium
status: active
---

# {{repo}} 已识别流程清单
> 全量流程追踪清单。ingest 会把所有识别到的流程写入本表，并按分析顺序串行 deep-analysis；本表用于记录证据、排序依据和完成状态。

## Deep Analysis 流程清单
| 分析顺序 | 流程名称 | 入口/接口 | 触发方式 | 涉及仓库/模块 | 是否跨消息边界 | 风险等级 | 推荐原因 | 证据链 | 可达性 | confidence | 状态 |
|---|---|---|---|---|---|---|---|---|---|---|---|
<!-- 填:每个识别到的流程一行;分析顺序用连续数字;证据链按 注册/分发/实现 简写;可达性写 target/ifdef/generated/unknown;初始状态=待深挖;自动深挖后该行状态→已深挖 -->
