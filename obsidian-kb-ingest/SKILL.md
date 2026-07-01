---
name: obsidian-kb-ingest
description: Use to create or refresh the first-pass Obsidian code knowledge base for one or more source repositories. Triggers on requests like "ingest this repo", "analyze this codebase into wiki notes", "build code-kb", "generate overview/architecture/submodules/flows", or "把仓库生成知识库".
---

# Obsidian KB Ingest

首次仓库分析。目标:先建有用的广度,再补聚焦的深度。

**始终配合 `obsidian-kb-authoring` 写笔记。** 目录、frontmatter、页面形状、链接契约全部以 authoring 的 `references/` 为准。**阶段编排不在本文描述**——由 `obsidian-kb-authoring/registry.yaml` 的 `pipelines.ingest` 定义,每个阶段的指导在 `obsidian-kb-authoring/pipelines/ingest/*.md`。

## 执行循环

用 helper 驱动(命令清单见 `using-obsidian`):

1. `pipeline status --repo {repo}` 看进度(每个 stage:done / ready / blocked)。
2. `pipeline next --repo {repo}` 拿下一个 ready stage + 它的 instruction 正文。
3. 按 instruction 用 authoring/references 写页——优先 `scaffold {type}` 拿骨架再填。
4. 无产物的自查型 stage(supplements / domains-contracts / backlinks)处理完后 `pipeline done {stage} --repo {repo}` 标记完成。
5. 回到第 1 步,直到 `status` 全部 done。

`deep-dive` 是最后一个 stage:对 `candidate-flow.md` 每条流程串行调 `obsidian-kb-deep-analysis`(优先专职子 agent,一次一个,不并行),每完成一条把该行状态翻 `已深挖`;表全绿本阶段才完成。详见 `pipelines/ingest/deep-dive.md`。

## `{kb-root}` 解析

见 authoring `references/kb-root-resolution.md`。仅当源仓库根或摄入范围无法推断时才询问,永不问 `{kb-root}` 放哪。

## 质量底线

- 代码与 README 冲突时以代码为准。
- 业务流程发现不止步于地形扫描;识别到的所有流程都记入 `candidate-flow.md`。
- 入口或依赖不清时标 `confidence: low`,不编造行为。
- 首扫幂等:对未变源码重跑产生等价笔记。
- 保留人工编辑:合并而非覆盖。
