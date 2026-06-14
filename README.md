# Obsidian Code KB Skill Suite

这是一个面向 agent 的 Obsidian 代码知识库技能套件，用来构建、读取、更新和治理多仓代码知识库。

它的目标不是生成普通文档，而是给 agent 提供可检索、可追溯、可用于研发决策的上下文：业务域、架构、模块、接口、协议、关键流程、跨仓依赖、风险点和源码证据。

## 核心入口

优先使用 `using-obsidian`。

它是路由 skill，负责判断用户意图，然后调用最小必要的执行 skill：

| 需求 | 使用的 skill |
|---|---|
| 初始化知识库 | `using-obsidian` + `obsidian-kb-authoring` |
| 首次摄入代码仓 | `obsidian-kb-ingest` + `obsidian-kb-authoring` |
| 读取知识库、分析影响、查询上下文 | `obsidian-kb-query` |
| 代码变更后更新知识库 | `obsidian-kb-update` + `obsidian-kb-authoring` |
| 深入分析关键流程/函数/协议链路 | `obsidian-kb-deep-analysis` + `obsidian-kb-authoring` |
| 检查知识库健康度 | `obsidian-kb-lint` |
| 编写 Obsidian Markdown | `obsidian-markdown` |

## 知识库位置

用户不需要主动告诉 agent 知识库路径。

当用户说“读取知识库”“查询影响”“帮我分析某个字段会影响哪些流程”时，agent 应自动发现 `{kb-root}`：

1. 用户显式指定路径时，使用用户指定的路径。
2. 当前 agent 工作目录中能检查到知识库目录时，使用检查到的目录。
3. 否则使用当前 agent 工作目录下的 `code-kb/`。

agent 不应询问用户知识库应该放在哪里。

一个目录如果包含这些结构，通常就是知识库：

```text
index.md
global/
repos/
log.md
```

## 知识库结构

默认知识库根目录是：

```text
{workspace-root}/code-kb
```

推荐结构：

```text
code-kb/
  index.md
  global/
    system-architecture.md
    dependency-graph.md
    business-domain-map.md
    contract-map.md
    data-flow.md
    risk-map.md
    shared-patterns.md
    cross-repo-concerns.md
  domains/
    {业务域}.md
  contracts/
    {契约名}.md
  repos/
    {repo-name}/
      overview.md
      architecture.md
      glossary.md
      modules/
      flows/
      api-surface.md
      data-models.md
      config-and-env.md
      error-handling.md
      testing-strategy.md
      key-implementations.md
      gotchas.md
  log.md
```

## 推荐工作流

### 1. 初始化

```text
Use using-obsidian to initialize a multi-repository code knowledge base in the current workspace.
```

agent 会创建 `code-kb/` 的基础结构和种子页面。

### 2. 摄入代码仓

```text
Use using-obsidian to ingest the repositories under this workspace into code-kb.
```

`obsidian-kb-ingest` 会先做宽度扫描，再生成仓库概览、架构、模块、接口、数据模型、关键流程和全局页面。

`depth 2` 只用于快速识别仓库地形，不是业务流程发现上限。agent 必须继续深入扫描入口、接口、handler、协议分发、消息消费、状态机、定时任务和核心 orchestrator。

摄入结束时必须输出：

```markdown
## Deep Analysis 候选流程确认表

| 序号 | 流程名称 | 入口/接口 | 触发方式 | 涉及仓库/模块 | 是否跨消息边界 | 风险等级 | 推荐原因 | 建议分析 |
|---|---|---|---|---|---|---|---|---|
```

用户确认后，主 agent 优先以子 agent 形式调度 deep-analysis：

- 一个子 agent 只分析一个流程。
- 必须等上一个子 agent 完成后，才能创建下一个。
- 不允许批量创建子 agent。
- 禁止并行 deep-analysis。
- 如果环境没有子 agent 能力，则由主 agent 串行执行。

### 3. 深度分析关键流程

```text
Use using-obsidian. Run deep analysis for the approved candidate flows from the ingest table.
```

`obsidian-kb-deep-analysis` 默认连续执行所有阶段，不在阶段之间暂停。

Phase 2 必须主动发现关键分支流程，并逐个展开。agent 不能只分析主干附近的显眼分支，也不能用“其他分支类似”“暂不展开”“略”跳过关键分支。

它会生成：

```text
repos/{repo-name}/flows/{分析主题}/
  调用树.md
  主干流程.md
  {分支主题}.md
  跨边界数据流.md
  数据结构.md
  自查报告.md
```

通信领域流程不能停在消息边界。遇到 TLV、协议报文、socket、MQ、RPC、event、topic、command ID、handler registry 等边界时，agent 必须默认扫描整个 workspace，继续定位对端处理逻辑。

跨边界分析不能只标明接口、topic、消息 ID、TLV type 或 handler 名称。必须把发送方和接收方的完整处理逻辑都分析出来：

- 发送方：触发入口、前置条件、字段来源、校验、payload 构造、编码、发送调用、发送前后状态变化、错误处理、重试/超时。
- 接收方：接收入口、解码/解析、分发映射、handler、校验、字段消费、业务处理、状态变化、副作用、响应/ACK/NACK、回调或后续消息。

如果找不到对端实现，要标记 `confidence: low`，记录缺失证据，不能编造行为。

### 4. 读取知识库做影响分析

```text
读取知识库，帮我分析修改 OrderRequest.resourceId 字段会影响哪些流程。
```

这类请求使用 `obsidian-kb-query`，属于 `impact-context`。

通用检索流程：

1. 自动发现 `{kb-root}`。
2. 判断任务阶段。
3. 抽取用户提到的业务词、类、字段、接口、协议、消息、模块、文件等实体。
4. 用 helper `search` 或 `rg` 在 frontmatter、标题、别名、正文、wikilinks 和 `sources` 中快速定位候选页面。
5. 读取相关 `domains/`、`contracts/`、`repos/{repo-name}/flows/`、`repos/`、`global/` 页面。
6. 沿 wikilinks/backlinks 查找上下游影响。
7. 必要时读取源码验证。
8. 输出受影响流程、契约、模块、数据结构、跨边界消息、风险、证据和知识库缺口。

查询默认只读，必须返回：

```yaml
side_effects: none
```

### 5. 代码变更后更新知识库

```text
Use using-obsidian to update the knowledge base for these changed files.
```

`obsidian-kb-update` 会把变更映射到受影响页面，只更新必要内容。

通信领域变更要追踪两侧：

- TLV/protocol/message-code/command-code
- MQ topic/producer/consumer
- socket/frame/parser/encoder/decoder
- event emit/listen/subscriber
- handler registry/dispatch table
- RPC client/server/interface

这些变更可能影响：

- `contracts/`
- `repos/{repo-name}/api-surface.md`
- `repos/{repo-name}/data-models.md`
- 相关 flow 页面
- deep flow folder
- `跨边界数据流.md`
- `global/data-flow.md`
- `global/cross-repo-concerns.md`
- `global/risk-map.md`

### 6. 检查知识库

```text
Use using-obsidian to lint the current code-kb.
```

`obsidian-kb-lint` 检查：

- 必要页面是否存在。
- frontmatter 是否完整。
- wikilinks 是否断裂。
- 是否有孤立页面。
- source evidence 是否存在或陈旧。
- flow/module/contract 链接是否缺失。
- 重要源码目录是否没有被知识库覆盖。

默认只报告，不自动修复。只有用户明确要求修复时才写入。

## 页面写作规则

所有写入知识库的页面都必须遵守 `obsidian-kb-authoring`：

- 中文知识 prose 为默认语言。
- 代码标识符、路径、API、协议名、库名保持原文。
- 每页必须有 Obsidian properties：

```yaml
---
title: 页面标题
type: flow
scope: workspace
repo: global
created: 2026-06-12
updated: 2026-06-12
sources:
  - repos/order-service/src/orders/create.ts:createOrder()
confidence: high
status: active
---
```

- 不使用源码行号作为长期证据引用。
- 不编造代码行为。
- 证据不足时设置 `confidence: low`。
- 重要 domain、flow、contract、module、risk、source 关系要维护双向 wikilinks。
- 重要写操作要记录到 `log.md`。

## 内置 Helper

`using-obsidian` 自带零依赖 Node.js helper：

```text
using-obsidian/scripts/obsidian-kb.mjs
```

常用命令：

```bash
node using-obsidian/scripts/obsidian-kb.mjs resolve --json
node using-obsidian/scripts/obsidian-kb.mjs init
node using-obsidian/scripts/obsidian-kb.mjs search "业务开通" --json
node using-obsidian/scripts/obsidian-kb.mjs lint
node using-obsidian/scripts/obsidian-kb.mjs links contracts/AllocateResource.md --json
node using-obsidian/scripts/obsidian-kb.mjs report --json
```

helper 只是确定性辅助工具，不改变 skill 的权限规则。只读查询不能因为 helper 存在就自动写入知识库。

## 常用提示词

```text
使用 using-obsidian，在当前 workspace 初始化一个多仓代码知识库。
```

```text
使用 using-obsidian，把当前 workspace 下的所有代码仓摄入到 code-kb，优先关注跨仓契约和核心端到端流程。
```

```text
读取知识库，帮我分析修改某个类中的字段会影响哪些流程。
```

```text
使用 using-obsidian，查询哪些流程、模块或契约依赖 contracts/AllocateResource.md。只返回 impact-context，不要更新知识库。
```

```text
使用 using-obsidian，根据已变更的协议 handler 和相关消息字段，增量更新知识库。
```

```text
使用 using-obsidian，检查当前 code-kb，报告断链、缺失元数据、陈旧 sources 和覆盖缺口。默认只报告，不要自动修复。
```
