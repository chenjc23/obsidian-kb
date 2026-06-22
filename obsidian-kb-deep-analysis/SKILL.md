---
name: obsidian-kb-deep-analysis
description: Use for deep analysis of a specific function, algorithm, business flow, call chain, or execution path in an Obsidian code knowledge base. Triggers on "deep analysis", "完整流程", "调用树", "分析这个函数", "算路流程", "trace this flow", or any request requiring phase-by-phase source-code tracing and detailed flow notes.
---

# Obsidian KB Deep Analysis

针对单个函数/流程的详尽追踪，比普通流程文档严格得多。

**始终配合 `obsidian-kb-authoring` 写笔记。** frontmatter、页面形状、目录、链接契约全部以 authoring 的 `references/` 为准，本 skill **不重复声明 schema 或页面骨架**——一律以 authoring 为单一来源。深流程文件夹各页的形状见 authoring `references/page-shapes.md` 的"深流程文件夹"小节。

增量铁律：深度分析也**只做加法 + 打 stale**——写本流程文件夹、把可复用定义提升到对应的定义页、给受影响的工作区人工叙事页打 `status: stale`、append `log.md`；不全量重建工作区地图。

## 输出位置

```text
repos/{repo-name}/flows/{分析主题}/
├── 调用树.md
├── 主干流程.md
├── {分支主题}.md
├── 跨边界数据流.md
├── 数据结构.md
└── 自查报告.md
```

只在加双链或更新共享定义页（`contracts/{契约名}.md`、`repos/{repo}/data-models.md`、`repos/{repo}/architecture.md`、`log.md`）时编辑本文件夹外的文件。

## 执行模式

- 默认连续跑完所有 phase，phase 间不暂停（除非用户显式要求逐步评审）。
- 每个 phase 仍须独立落盘后再进下一个，保证部分结果可检视、可恢复。
- 跨消息追踪默认扫描整个 workspace；除非用户显式限定范围，不要把下游 handler 发现局限在当前仓库。
- 每个 phase 后报告：`Phase N 完成，继续 Phase N+1...`

## Phase 0：调用树摸底 → `调用树.md`

1. 创建 `repos/{repo}/flows/{分析主题}/`。`{分析主题}` 文件夹名默认用中文，只保留必要英文。
2. 从指定入口函数开始，递归追踪被调函数。

每个函数记录：函数名/签名、仓库根起的文件路径、一句话职责、是否含条件分支及数量、是否外部调用（RPC/DB/MQ/文件系统/网络/子进程）、是否跨协议/消息/事件/topic/socket/TLV 边界、Phase 2 展开后链到对应分支页 `[[分支主题]]`（分支页后生成则回来补链）。

树格式：

```text
├── computeRoute() [src/route/compute.go] — 算路总入口，3 条分支
│   ├── loadTopology() [src/topo/loader.go] — 加载拓扑，外部调用：DB
│   └── preprocessResource() [src/resource/prep.go] — 资源预处理
```

不用 `...`/"等"/"类似"/任何占位符跳过节点。超过 200 节点则存第一部分、续写到编号续接文件、在 `自查报告.md` 记录拆分。

## Phase 1：主干流程分析 → `主干流程.md`

以 Phase 0 调用树为基线：

1. 沿最常见/默认路径从入口走到最终返回。
2. 独立分析该路径上每个函数。
3. 主路径到达消息/协议/RPC/MQ/event/socket/TLV/topic/command/handler dispatch/callback 等异步边界时，**不在发送方停**——跨 workspace 继续追到接收方入口，并把接收方主干处理纳入 `主干流程.md`。

每步包含：函数签名与路径、入参出参类型、伪代码级逻辑（非一句话）、读写数据结构、状态变更、跨边界主干追踪（边界种类与标识、发送方、接收方发现证据、接收方入口与主干处理结果；找不到接收方则记 confidence）、分支标记 `此处有 N 条分支路径，将在 Phase 2 展开`。

Phase 1 不替代 Phase 3：Phase 1 让主业务链跨边界连续；Phase 3 把边界展开为完整字段映射、ACK/响应、回调、重试、超时、补偿。

找不到接收方/上游时**不编造**：标 `confidence: low`，记录精确搜索证据，主流程对边界缺口保持诚实，并把缺口加进 Phase 5 `自查报告.md`。

禁止的捷径："类似的处理"、"同理"、"以此类推"、"不再赘述"、"此处省略"、"等等"、用 `...` 跳过函数或分支、"发送消息后结束"、在需要接收方主干处理才能理解主链时写"接收方见 Phase 3"。

## Phase 2：分支流程逐个展开

1. 回到 Phase 1 每个分支标记。
2. 主动从调用树、条件表达式、错误路径、协议/消息分发、状态机迁移、重试、回滚、超时、下游回调发现更多关键分支。
3. 按重要性与风险排序，**完整分析每个关键分支**。

**分析写在哪，按分支体量决定（避免过度拆文件）：**

- **简单分支就地写**：逻辑短、低风险、无嵌套的分支，直接写在 `主干流程.md` 对应步骤下，**不单独成文件**。
- **提取 `{分支主题}.md`**：仅当分支够分量单独成题——逻辑链长、深度嵌套、高风险、业务关键、被复用，或写进主干会让主干臃肿。

这是决定"写在哪"，**不是决定"要不要分析"**。每个关键/高风险/业务关键分支都必须被覆盖；简单分支只是就地写，不是跳过。

每个分支（无论就地还是独立成文件）含：精确条件表达式、进入分支后的完整逻辑链、合并点、嵌套分支、是否有子分支未覆盖。**独立成文件**的分支还需补来源双链（主干 `[[主干流程#Step ...]]` + `[[调用树]]` 节点 + 兄弟/嵌套分支）。

不要只分析主路径上的显眼分支。提取出来的分支多就拆多个文件，直到所有高风险/业务关键分支覆盖完。关键分支未覆盖须以源码证据说明并在 `自查报告.md` 记为缺口，不得用"其他分支类似"/"暂不展开"/"略"敷衍。

链接闭环（仅针对**独立成文件**的分支，详见 authoring `references/link-contract.md`）：主干分支标记 ↔ 独立分支页双向；分支页 ↔ `[[调用树]]` 节点双向；嵌套分支父↔子双向；调用树展开节点链到对应分支页。就地分析的简单分支无需跨文件链接。

## Phase 3：跨消息边界与端到端数据流 → `跨边界数据流.md`（瘦身：契约提升）

不止步于消息边界。遇到 TLV、协议帧、消息收发、socket、MQ、RPC、event、topic/command/operation-code/handler dispatch、callback 等边界时，跨整个 workspace 追到下游接收方或上游调用方，覆盖**发送方和接收方完整处理逻辑**（不止识别接口/topic/消息 ID/handler 名）。

**契约提升（关键）**：可复用的契约定义——消息标识、payload schema、字段定义、producer/consumer、接收方发现证据——一律**提升/同步到 `contracts/{契约名}.md`**（契约视图的定义页，只新增）。`跨边界数据流.md` **不重抄 schema**，只持有：

- 本流程穿越了哪些边界（列表，每个链到 `[[contracts/{契约名}]]`）。
- 本场景发送方业务前置、字段来源推导。
- 本场景接收方处理结果、状态变更、副作用、响应/ACK、后续消息。
- 发送方→接收方在本场景的字段映射表（值来自本流程的数据来源）。
- 端到端 `mermaid` `sequenceDiagram`。

找不到对端实现时：相关段落 `confidence: low`，记录精确搜索证据与缺失仓库/接口，缺口加进 `自查报告.md` 和 `log.md`，**不编造**。

## Phase 4：关键数据结构专题 → `数据结构.md`（瘦身：定义提升）

1. 从 Phase 1/2/3 提取关键数据结构。
2. **完整字段定义提升/同步到 `repos/{repo}/data-models.md`**（实现视图的定义页，加反向链）。`数据结构.md` **不重抄完整定义**，只持有本流程的：生命周期（谁构造→传递→消费→销毁）、在本流程被读/改的字段及含义、继承/组合/嵌套关系。
3. 流程有非平凡状态时才生成此页。

## Phase 5：自查补漏与链接 → `自查报告.md`

检查：

- Phase 0 调用树每个函数都覆盖。
- 每条分支覆盖（默认/else/错误/边界），Phase 2 关键分支要么完整分析、要么以证据列为低置信缺口。
- 关键分支都已分析（就地或独立成文件，不得跳过）；**独立成文件**的分支页与 `主干流程.md`、`调用树.md` 双链闭环，嵌套分支父子双向。
- 每个消息/协议/事件/topic/socket/RPC/TLV 边界有已追踪的接收方/调用方，或显式低置信缺口。
- 数据流从输入到输出连续；无结构凭空出现或消失。
- payload 字段在有代码证据时从生产源追到接收消费；发送/接收两侧逻辑都分析了（不止识别接口）。
- 提升到 `contracts/` 的契约、提升到 `data-models.md` 的结构都已加反向链。
- 每个生成的流程页链到至少两个相关既有页（有则），且被引页反向链回。

append `log.md`：分析主题、入口、生成文件、覆盖的跨边界消息/接口、提升到定义页的契约/结构、新增链接数、剩余低置信区域。

双链目标参考 authoring `references/link-contract.md`：`[[modules/{模块名}]]`、`[[repos/{repo}/data-models#结构名]]`、`[[key-implementations#实现名]]`、`[[config-and-env]]`、`[[runtime-notes#坑名]]`、`[[other-repo/modules/{模块名}]]`、`[[contracts/{协议或消息名}]]`。

## Frontmatter 与页面形状

**不在此声明**——一律用 authoring `references/frontmatter-schema.md`（含 `view`、`entry-point` 列表格式）和 `references/page-shapes.md`（深流程文件夹各页骨架）。深流程页 `type: flow`，`view` 默认 `runtime`（端到端业务场景可覆盖为 `usecase`），`sources` 用不带行号的 durable 引用。
