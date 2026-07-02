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
├── 分支主题.md
├── 跨边界数据流.md
├── 数据结构.md
└── 自查报告.md
```

用户主动要求 deep analysis 时,先从已 ingest 的 KB 中解析 `{repo}`:用函数名/路径/入口证据/流程名匹配 `repos/*/{candidate-flow,overview,architecture}.md` 和已有 `flows/`。高置信唯一匹配才自动写入该 `repos/{repo}/flows/`;不确定就先问用户放到哪个 repo。不要把当前目录名、`code-kb`、或猜测值默认当 `{repo}`。

helper 脚本在**与本 skill 同级**的 `using-obsidian/scripts/obsidian-kb.mjs`(不在本 skill 目录),命令用法见 `using-obsidian`。每个 stage 写自己那件时才 `scaffold flow --repo {repo} --topic {主题} --member {成员}` 拿本件骨架文本,填好后 `Write` 到打印的目标路径(写前自查、不覆盖人工页)。不一次吐全套——6 件跨 6 个 stage 写,写哪件吐哪件。

## 执行循环

1. `pipeline next --repo {repo} --pipeline deep-analysis --topic {主题}` 拿**唯一**下一个 ready stage + instruction——一次只做一件,不并行、不批量铺开六件(stage 已串成链,同一时刻只有一个 ready)。
2. 按 instruction 追踪源码,`scaffold flow --member {成员}` 拿骨架、填好、Write 落盘。
3. 回到第 1 步,直到 `pipeline status --pipeline deep-analysis` 全绿。六件全走 exists 闸门,文件落盘即自动判 done,无需手动 `pipeline done`。

- 默认连续跑完所有 stage,phase 间不暂停(除非用户显式要求逐步评审)。
- 每个 stage 独立落盘后再进下一个,保证部分结果可检视、可恢复。
- 跨消息追踪默认扫描整个 workspace;除非用户显式限定范围,不要把下游 handler 发现局限在当前仓库。

## 完成判据

文件夹必须含全部六件:`调用树.md`、`主干流程.md`、`分支主题.md`、`跨边界数据流.md`、`数据结构.md`、`自查报告.md`。不适用的成员也须生成,标 `confidence: low` 并在正文一句注明不适用(不静默省略、不缺文件)。
