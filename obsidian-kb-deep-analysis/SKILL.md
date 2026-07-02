---
name: obsidian-kb-deep-analysis
description: Use for deep analysis of a specific function, algorithm, business flow, call chain, or execution path in an Obsidian code knowledge base. Triggers on "deep analysis", "完整流程", "调用树", "分析这个函数", "算路流程", "trace this flow", or any request requiring phase-by-phase source-code tracing and detailed flow notes.
---

# Obsidian KB Deep Analysis

针对单个函数/流程的详尽追踪,比普通流程文档严格得多。

**始终配合 `obsidian-kb-authoring` 写笔记。** frontmatter、页面形状、目录、链接契约以 authoring 的 `references/` 为准。**阶段编排不在本文描述**——由 `registry.yaml` 的 `pipelines.deep-analysis` 定义,各阶段指导在 `obsidian-kb-authoring/pipelines/deep-analysis/*.md`。

## 输出位置

```text
repos/{repo}/flows/{分析主题}/
├── 调用树.md
├── 主干流程.md
├── {分支主题}.md
├── 跨边界数据流.md
├── 数据结构.md
└── 自查报告.md
```

每个 stage 写自己那件时才 `scaffold flow --repo {repo} --topic {主题} --member {成员}` 拿本件骨架文本,填好后 `Write` 到打印的目标路径(写前自查、不覆盖人工页)。不一次吐全套——6 件跨 6 个 stage 写,写哪件吐哪件。

## 执行循环

1. `pipeline next --repo {repo} --pipeline deep-analysis --topic {主题}` 拿下一个 ready stage + instruction。
2. 按 instruction 追踪源码、写对应页。
3. 无产物的自查型 stage(branches / cross-boundary / data-structures)处理完后 `pipeline done {stage} --repo {repo} --pipeline deep-analysis` 标记。
4. 回到第 1 步,直到 `pipeline status --pipeline deep-analysis` 全绿。

- 默认连续跑完所有 stage,phase 间不暂停(除非用户显式要求逐步评审)。
- 每个 stage 独立落盘后再进下一个,保证部分结果可检视、可恢复。
- 跨消息追踪默认扫描整个 workspace;除非用户显式限定范围,不要把下游 handler 发现局限在当前仓库。

## 完成判据

文件夹必须含 `调用树.md`、`主干流程.md`、`自查报告.md`;`跨边界数据流.md`/`数据结构.md`/`{分支主题}.md` 按适用性产出,不适用时在 `自查报告.md` 写明原因(不静默省略)。
