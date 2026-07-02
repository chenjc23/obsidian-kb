<h1 align="center">Obsidian Code KB Skill Suite</h1>

<p align="center">
  <strong>面向 agent 软件设计与开发的工程知识库。</strong>
  <br />
  <em>把代码事实、系统架构、业务流程、跨仓契约和影响关系沉淀为可追溯、可查询、可增量演进的内部知识资产。</em>
</p>

<p align="center">
  <a href="#-快速开始"><img src="https://img.shields.io/badge/Quick_Start-blue" alt="Quick Start" /></a>
  <a href="#-核心优势"><img src="https://img.shields.io/badge/Core_Model-five_views-7c3aed" alt="Five View Model" /></a>
  <a href="#-如何支撑-agent-设计与开发"><img src="https://img.shields.io/badge/Agent_Engineering-context_ready-00a67e" alt="Agent Engineering" /></a>
  <a href="#-under-the-hood"><img src="https://img.shields.io/badge/Under_the_Hood-incremental_architecture-d4a574" alt="Under the Hood" /></a>
</p>

---

**当 agent 要参与真实的软件设计和开发，它缺的往往不是“再多读几个文件”，而是一套能在不同阶段提供不同抽象层次的工程知识底座。**

需求理解时，它需要知道业务域、用例和系统边界。方案设计时，它需要知道模块职责、跨仓契约、耦合关系和风险点。编码实现时，它需要准确定位入口、数据结构、主干流程、分支处理和源码证据。代码评审和影响分析时，它需要沿业务、流程、契约、模块之间的关系快速推导影响面。

`Obsidian Code KB Skill Suite` 预期解决的就是这件事：把大规模软件系统里的代码事实、业务理解和架构关系沉淀成一个可持续演进的 Obsidian 知识库，让 agent 高效完成软件设计和开发，也让开发人员快速理解系统和业务，形成长期有效的工程资产。

> 它不是普通 wiki，也不是一次性代码扫描报告。它是一套面向 agent 消费的工程知识建模方法：五视图模型、增量架构抽象、核心业务流预编译、双向链接影响传播。

---

## ✨ 核心优势

<table>
  <tr>
    <td width="50%" valign="top">
      <h3>🧭 五视图模型 + 代码事实</h3>
      <p>按用例、逻辑、实现、运行、契约五个视角组织知识，让 agent 在需求理解、方案设计、编码实现、评审分析时获得不同抽象层次和粒度的工程上下文。</p>
    </td>
    <td width="50%" valign="top">
      <h3>🏗️ 增量构建系统架构</h3>
      <p>面向超大 C++ / 多仓系统，先按子系统和模块逐步建设，增量保存用例、业务域、契约沉淀跨子系统关联，最终派生上层系统架构视图。</p>
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <h3>🧩 预编译核心业务流</h3>
      <p>提前沉淀主干流程、关键处理、跨仓接口、数据流和分支逻辑，让 agent 能按需求或问题语义快速索引到连贯、聚焦的业务认识。</p>
    </td>
    <td width="50%" valign="top">
      <h3>🔗 双向链接影响遍历</h3>
      <p>用双向链接关联契约、业务、流程和模块，支撑 agent 在方案设计、影响分析和代码评审时遍历耦合场景、影响范围和风险点。</p>
    </td>
  </tr>
</table>

### 1. 五视图模型 + 代码事实

软件设计和开发在不同阶段需要不同层次、不同粒度的知识。

需求阶段需要的是系统架构、模块职责和业务域等；方案阶段需要的是系统边界、模块职责和契约关系；实现阶段需要的是入口函数、数据结构、调用链和关键分支；评审阶段需要的是影响面、风险点和证据链。

本知识库用改造后的五视图模型组织这些内容：

| 视图 | 解决的问题 | 典型页面 |
|---|---|---|
| 用例视图 | 用户、外部系统或业务流程想完成什么 | `global/use-cases/` |
| 逻辑视图 | 系统有哪些业务概念、领域边界和架构结构 | `global/domains/`、`architecture.md`、`glossary.md` |
| 实现视图 | 代码如何落地，模块、数据结构、配置和核心实现在哪里 | `overview.md`、`submodules/`、`data-models.md`、`specifications.md`、`resource-analysis.md` |
| 运行视图 | 运行时流程如何展开，主干、分支、异常和状态变化是什么 | `flows/`、`candidate-flow.md`、`human-interfaces.md` |
| 契约视图 | 跨仓、跨模块、跨协议边界如何对话 | `global/contracts/`、`api-surface.md`、`api-depend.md` |

每一层都要求落到代码事实：`sources` 记录源码证据，`confidence` 标记置信度，证据不足时明确降级，而不是把推测写成事实。

### 2. 支撑超大 C++ / 多仓系统的增量知识库构建

超大 C++ 系统或多仓系统很难一次性完整逆向。现实做法通常是按子系统、模块、协议域逐步建设知识库。但这会带来一个核心问题：

> 如果知识库是增量构建的，如何在只理解局部子系统的过程中，逐步抽象出整个系统的上层架构视图？

本项目的答案是：不要先强行画一个全局大图，而是在增量过程中持续沉淀三个跨子系统的上层抽象：

- **用例**：记录端到端业务场景和跨模块编排。
- **业务域**：记录稳定的业务概念、状态、不变量和相邻域。
- **契约**：记录跨仓接口、协议消息、topic、事件、producer/consumer 和 payload schema。

每摄入一个子系统，知识库都会补充它参与了哪些用例、落在哪些业务域、生产或消费哪些契约。这样即使系统还没有完全摄入，子系统之间的关系也会通过 use-case、domain、contract 逐步显现。

当积累到一定程度后，再主动触发 `update`，基于已沉淀的用例、业务域、契约和各子系统局部架构，派生并抽象出更高层的系统架构视图。这个过程不是一次性脑补全局，而是从可追溯的局部事实逐步长出全局理解。

### 3. 预编译核心业务流

agent 真正做需求分析、排障、方案设计时，最需要的往往不是“所有代码细节”，而是某条核心业务流的连贯认识：

- 入口在哪里。
- 主干流程怎么走。
- 关键处理和分支条件是什么。
- 哪些数据结构被读写。
- 跨仓接口、消息、协议如何传递。
- 发送方和接收方分别做了什么。
- 哪些错误、重试、超时、补偿和状态变化会影响结果。

因此本项目会提前编译核心业务流，生成深度流程文件夹：

```text
repos/{repo-name}/flows/{分析主题}/
  调用树.md
  主干流程.md
  {分支主题}.md
  跨边界数据流.md
  数据结构.md
  自查报告.md
```

这让 agent 可以根据需求或问题语义快速索引到一组连贯、聚焦、带源码证据的业务认识，而不是临时从零开始读一整片代码。

### 4. 双向链接支撑方案设计和影响遍历

软件设计很少只改一个点。一个字段、接口或流程变化，可能牵动业务场景、跨仓契约、模块依赖、运行风险和测试策略。

本知识库要求业务、流程、契约、模块之间建立双向链接：

- 用例 ↔ 流程。
- 业务域 ↔ 流程。
- 流程 ↔ 契约。
- 流程 ↔ 模块。
- 契约 ↔ producer / consumer。
- 模块 ↔ 模块依赖。

这些关系是 agent 在方案设计、影响分析、代码评审时遍历耦合场景、影响范围和风险点的基础图结构。

---

## 🚀 快速开始

在项目工程根目录进入 agent，按三步走。

### 1. 解构代码仓

生成架构、模块、功能、流程、术语等知识：

```text
/obsidian-kb-ingest {代码仓路径}
```

默认知识库根目录（也可以在ingest时指定）：

```text
{workspace-root}/code-kb
```

首次摄入会建立基础广度：仓库地形、架构路由、模块边界、接口面、数据模型、配置、运行风险、业务域和跨边界契约等知识；并识别核心业务流程进行自动的深度分析。

### 2. 深度分析关键流程

某个业务流程对需求实现比较关键，且当前知识库尚未识别清楚，可以指定它做深度分析：

```text
/obsidian-kb-deep-analysis {流程名称} {相关联的一两个接口}
```

深度分析会补全主干、分支、跨边界数据流、数据结构和自查报告。针对消息类流程，会默认继续定位对端处理逻辑。

### 3. 使用知识库查询

结合知识库做实现定位、需求分析、影响分析、调试或评审：

```text
/obsidian-kb-query 回答{...问题}
```

或：

```text
读取{...需求}，使用 obsidian-kb-query 技能挖掘代码相关现状和需求在现状上需要的变更锚点
```

查询默认只读。知识库信息不足时，agent 会读取源码补足证据再回答，但不会顺手写回知识库。


---

## 🧠 如何支撑 Agent 设计与开发

### 需求理解阶段

agent 先从系统架构、用例视图、业务域和 coverage 建立背景认识：

- 当前需求属于哪个业务域。
- 涉及哪些端到端用例。
- 哪些子系统已经被知识库覆盖。
- 哪些跨仓边界还是 partial 或未知。

这样可以避免 agent 一开始就陷入局部代码文件，而是先拿到业务和系统边界。

### 方案设计阶段

agent 从 use-case、domain、contract、module、flow 之间的双向链接扩散：

- 找相关业务流程。
- 找 producer/consumer 和跨仓契约。
- 找相关模块和被依赖模块。
- 找运行风险、错误处理和已知陷阱。
- 找知识库明确标出的盲区。

这一步的目标是帮助 agent 在设计方案时主动看到耦合场景、影响范围和潜在风险，而不是只给出局部实现建议。

### 编码实现阶段

agent 进入仓内实现视图和运行视图：

- `architecture.md` 找仓库结构和路由入口。
- `overview.md` / `submodules/` 找仓级职责、子模块设计和依赖。
- `data-models.md` 找关键结构和字段语义。
- `flows/{分析主题}/` 找主干流程、关键分支和跨边界数据流。
- `sources` 回到源码验证事实。

这让编码实现有明确落点，也能减少重复读代码的成本。

### 评审与影响分析阶段

agent 沿影响传播边遍历：

- 契约页的 `producer` / `consumer`。
- 模块页的 `depends-on`。
- 流程页的 `entry-point` / `related-contracts` / `related-submodules`。
- 正文 wikilinks 的反向链。

输出受影响流程、契约、模块、数据结构、跨边界消息、运行风险和知识缺口。

---

## 🧩 增量构建到系统架构抽象

大系统知识库不可能一口气完整生成。这个项目把“增量构建”和“系统级抽象”拆成两个节奏。

### 第一步：按子系统逐步摄入

每个子系统先产生自己的局部知识：

```text
repos/{repo-name}/
  overview.md
  constraints.md
  architecture.md
  api-surface.md
  api-depend.md
  data-models.md
  specifications.md
  resource-analysis.md
  human-interfaces.md
  candidate-flow.md
  usecases/
  submodules/
  flows/
```

此时的重点是忠实记录代码事实：模块职责、入口、接口、数据结构、运行风险和候选流程。

### 第二步：沉淀跨子系统关联

摄入和深挖过程中，持续把跨子系统知识提升到工作区层：

```text
global/
  use-cases/
  domains/
  contracts/
  architecture/coverage.md
```

其中：

- `use-cases/` 记录端到端业务场景和跨模块编排。
- `domains/` 记录业务概念、状态、不变量和相邻域。
- `contracts/` 记录 HTTP/RPC/MQ/event/TLV/socket/frame 等跨边界契约。
- `coverage.md` 记录哪些仓已摄入、摄入深度、待接合边和已知盲区。

这些页面让“局部子系统知识”逐渐变成“跨子系统关系网络”。

### 第三步：主动触发 update 抽象系统架构

当用例、业务域、契约和多个子系统局部架构积累到一定程度后，通过增量更新流程触发更高层抽象：

1. 读取系统用例，识别跨子系统业务编排。
2. 读取业务域，识别核心领域边界和相邻域。
3. 读取契约，识别 producer/consumer、消息流和接口依赖。
4. 读取各子系统 `architecture.md`，获得局部架构。
5. 结合 coverage 中的待接合边和盲区，派生系统级架构视图。

也就是说，上层系统架构不是凭空生成，而是从 use-case、domain、contract 和 repo architecture 这些可追溯事实中抽象出来。

---

## 📦 知识库产物结构

```text
code-kb/
  index.md
  log.md

  global/
    use-cases/
      {用例名}.md
    domains/
      {业务域}.md
    contracts/
      {契约名}.md
    architecture/
      system-architecture.md
      coverage.md
    extra/
      {标题}.md

  repos/{repo-name}/
    overview.md
    constraints.md
    architecture.md
    glossary.md
    api-surface.md
    api-depend.md
    data-models.md
    specifications.md
    resource-analysis.md
    human-interfaces.md
    candidate-flow.md
    usecases/{场景}.md
    submodules/{主题}/
      子模块设计.md
      子模块约束.md
    flows/{分析主题}/
      调用树.md
      主干流程.md
      {分支主题}.md
      跨边界数据流.md
      数据结构.md
      自查报告.md
```

这些页面共同形成 agent 和开发人员共享的工程知识资产：

- 人可以通过 Obsidian 阅读、跳转、理解系统。
- agent 可以通过 frontmatter、wikilinks、sources 和页面结构检索、推理、验证。

---

## 🔧 Under the Hood

### 视图是抽象层，不是目录层

五视图用于描述知识的抽象层次和查询路径，不强行在每个仓里复制五套目录。仓内页面保持扁平，工作区层负责承载跨仓抽象。

### 代码事实优先

每个结论都应有源码或稳定文档证据：

```yaml
sources:
  - repos/order-service/src/orders/create.ts:createOrder()
confidence: high
```

没有证据就标低置信，不编造对端、不猜测字段含义、不用“类似逻辑”跳过关键流程。

### partial 契约表达增量盲区

跨仓边界只找到一端时，契约页使用：

```yaml
status: partial
```

并在 `global/architecture/coverage.md` 记录待接合边。它表达的是“当前知识库知道这里还没接上”，不是“没有下游”。

### 影响面即时遍历

依赖图、影响图、数据流图不常驻成页面。它们由 query 沿结构化关系字段和双向 wikilinks 即时推导，避免静态图随增量更新漂移。

---

## 🧱 页面写作规则

所有写入知识库的页面都遵守 `obsidian-kb-authoring`。

核心 frontmatter：

```yaml
---
title: 页面标题
type: flow
repo: order-service
created: 2026-06-12
updated: 2026-06-12
sources:
  - repos/order-service/src/orders/create.ts:createOrder()
confidence: high
status: active
---
```

写作约束：

- 中文知识 prose 为默认语言。
- 代码标识符、路径、API、协议名、库名保持原文。
- `sources` 使用 durable 引用，不使用源码行号作为长期证据。
- 证据不足时设置 `confidence: low`。
- 重要 domain、flow、contract、overview/submodule、risk、source 关系维护双向 wikilinks。
- 重要写操作记录到 `log.md`。

---

## 🛠️ Helper 命令

项目带一个零依赖 Node.js helper，用于确定性机械动作，比如初始化目录、吐页面骨架（供 agent 填好后写入）、搜索、查链接、lint 和 report。

```text
using-obsidian/scripts/obsidian-kb.mjs
```

常用命令：

```bash
node using-obsidian/scripts/obsidian-kb.mjs resolve --json
node using-obsidian/scripts/obsidian-kb.mjs init
node using-obsidian/scripts/obsidian-kb.mjs types
node using-obsidian/scripts/obsidian-kb.mjs scaffold overview --repo {repo} --title {仓库名}
node using-obsidian/scripts/obsidian-kb.mjs scaffold submodule --repo {repo} --topic {子模块主题} --member 上下文
node using-obsidian/scripts/obsidian-kb.mjs scaffold flow --repo {repo} --topic {分析主题} --member 调用树
node using-obsidian/scripts/obsidian-kb.mjs scaffold contract --partial --side producer \
  --title {契约名} --known {repo} --evidence "{path:func()}"
node using-obsidian/scripts/obsidian-kb.mjs lint
node using-obsidian/scripts/obsidian-kb.mjs report --json
```

helper 只负责机械动作，不替代 agent 对代码和业务的分析判断。

---

## 💬 常用提示词

```text
/obsidian-kb-ingest {代码仓路径}
```

```text
/obsidian-kb-deep-analysis {流程名称} {相关联的一两个接口}
```

```text
/obsidian-kb-query 回答修改某个类中的字段会影响哪些流程。
```

```text
/obsidian-kb-query 回答哪些流程、模块或契约依赖 global/contracts/AllocateResource.md？只做只读影响分析，不要更新知识库。
```

```text
/obsidian-kb-update 根据已变更的协议 handler 和相关消息字段，增量更新知识库。
```

```text
/obsidian-kb-lint 检查当前 code-kb，报告断链、缺失元数据、陈旧 sources 和覆盖缺口。默认只报告，不要自动修复。
```

---

## 📁 项目结构

```text
.
├── README.md
├── using-obsidian/
│   ├── SKILL.md
│   └── scripts/
│       ├── obsidian-kb.mjs
│       └── lib/
├── obsidian-kb-authoring/
│   ├── SKILL.md
│   ├── references/
│   └── templates/
├── obsidian-kb-ingest/
│   ├── SKILL.md
│   └── references/
├── obsidian-kb-deep-analysis/
│   └── SKILL.md
├── obsidian-kb-query/
│   └── SKILL.md
├── obsidian-kb-update/
│   └── SKILL.md
├── obsidian-kb-lint/
│   └── SKILL.md
└── obsidian-markdown/
    ├── SKILL.md
    └── references/
```

关键规则来源：

| 规则 | 唯一来源 |
|---|---|
| 页面结构 | `obsidian-kb-authoring/templates/{type}.template.md` |
| frontmatter 字段和枚举 | `obsidian-kb-authoring/references/frontmatter-schema.md` |
| 目录路径和维护方式 | `obsidian-kb-authoring/references/directory-contract.md` |
| 双链和影响传播边 | `obsidian-kb-authoring/references/link-contract.md` |

---
