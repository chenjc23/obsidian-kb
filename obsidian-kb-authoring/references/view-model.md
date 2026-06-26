# 五视图模型（View Model）

代码知识库按软件架构 **4+1 视图**改造，针对"逆向提炼 + agent 消费"的场景做了调整：部署视图替换为**契约视图**，用于承载跨仓接口、协议、消息和 producer/consumer 边界。

最终五视图：**用例 / 逻辑 / 实现 / 运行 / 契约**。影响分析不是常驻视图；它由 query 沿 `depends-on`、`producer`/`consumer` 和正文反向双链即时推导。

> 视图是**完整性透镜 + 页面查询维度**，不是物理目录树。
> 物理布局按"作用域"两层切（工作区 catalog + 仓内扁平）；视图不是物理目录、也不是 frontmatter 字段，而是由页面 `type` 派生的透镜（映射见下表）。详见 [directory-contract.md](directory-contract.md)。

## 五视图定义

| 视图 | 透镜 id（由 type 派生） | 回答的问题 | 性质 | 主要页面 | 作用域 |
|---|---|---|---|---|---|
| 用例视图（+1） | `usecase` | 用户/外部系统**想完成什么** | 动态·行为 | `global/use-cases/` | 工作区为主 |
| 逻辑视图 | `logical` | 系统里**有哪些业务概念与架构结构** | 静态·结构 | `global/domains/`、`global/architecture/`、仓内 `architecture`/`glossary` | 工作区为主 + 仓内架构 |
| 实现视图 | `development` | 代码**怎么落地、复用和配置** | 静态·代码 | 仓内 `modules`/`data-models`/`key-implementations`/`config-and-env`/`testing-strategy` | 仓内为主 |
| 运行视图 | `runtime` | 运行时**发生了什么** | 动态·流程 | 仓内 `flows/`、深流程 | 仓内为主 |
| 契约视图 | `contract` | 跨边界**怎么对话** | 静态·接口 | `global/contracts/`、仓内 `api-surface` | 工作区为主 |

## 用例视图 vs 逻辑视图（容易混淆，必须分清）

判据：**名词世界 vs 动词世界**。

| | `global/domains/`（逻辑） | `global/use-cases/`（用例） |
|---|---|---|
| 回答 | 系统里有哪些业务概念 | 用户/外部系统想完成什么 |
| 性质 | 静态结构 | 动态行为 |
| 单元 | 业务域（订单域、资源域、计费域） | 场景（开通服务、退订、改配） |
| 内容 | 概念、实体、不变量、状态定义、术语、相邻域 | actor、目标、前置、编排了哪些 flow、涉及哪些契约/域、端到端行为弧、验收/判定点 |
| 切法 | **纵切**（按概念领域） | **横切**（按端到端场景，跨多个域） |

一句话：**domain 是列，use-case 是行，flow 是格子里的实现。**

### 用例视图防呆规则（防止退化成 flow 索引）

- use-case 页**只为"多 flow / 跨仓"端到端场景而建**，内容以**编排 + 链接**为主，不复述 flow 内部细节。
- 单个 flow 就能讲完的场景，**不开 use-case 页**——它作为运行视图的 `flow` 存在；够格当 agent 入口时才升一个轻量编排型 `use-case` 页。
- use-case 是 agent 的**入口编排层**：`index.md → global/use-cases/ → (flows / global/contracts / global/domains / modules)`。

## type → 视图透镜映射（派生用，不落字段）

视图透镜由 `type` 派生，query/lint 按此表现算，不在页面存储。

| `type` | 视图透镜 |
|---|---|
| `use-case` | `usecase` |
| `domain` | `logical` |
| `glossary` | `logical` |
| `module` | `development` |
| `architecture` | `logical` |
| `data-model` | `development` |
| `implementation` | `development` |
| `config` | `development` |
| `flow` | `runtime` |
| `candidate` | `runtime` |
| `runtime-notes` | `runtime` |
| `contract` | `contract` |
| `api-surface` | `contract` |
| `risk` | `runtime` |
| `index` / `log` | `meta` |
| `extra` | `meta` |

## 查询入口（设计自检用）

agent 做需求分析 / 方案设计 / 影响面判断时，先按问题选择入口，再沿关系边收敛。任何页面若既不能作为入口，也不被这些关系边连接，要质疑它是否该存在。

```text
业务/场景问题        → use-cases → flows / contracts / domains
概念/边界问题        → domains / glossary → flows / modules
实现定位问题         → architecture → modules / flows / sources
接口/协议/消息问题    → contracts / api-surface → producer / consumer / flows
调试/运行问题        → flows → runtime-notes / contracts / modules
影响分析问题         → 被改实体 → contracts / data-models / modules → 反向双链扩散
```

目录用于缩小候选范围；真正的消费效率来自 [frontmatter-schema.md](frontmatter-schema.md)（可查询性）和 [link-contract.md](link-contract.md)（双链强制双向）。
