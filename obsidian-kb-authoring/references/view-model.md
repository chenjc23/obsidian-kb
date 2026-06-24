# 六视图模型（View Model）

代码知识库按软件架构 **4+1 视图**改造，针对"逆向提炼 + agent 消费"的场景做了调整：去掉部署视图（辅助编码不需要硬件/集群拓扑），并把**契约**和**影响**提升为一等视图。

最终六视图：**用例 / 逻辑 / 实现 / 运行 / 契约 / 影响**。

> 视图是**完整性透镜 + 页面查询维度**，不是物理目录树。
> 物理布局按"作用域"两层切（工作区 catalog + 仓内扁平）；视图维度靠页面 frontmatter 的 `view:` 字段承载。详见 [directory-contract.md](directory-contract.md)。

## 六视图定义

| 视图 | `view` 值 | 回答的问题 | 性质 | 主要页面 | 作用域 |
|---|---|---|---|---|---|
| 用例视图（+1） | `usecase` | 用户/外部系统**想完成什么** | 动态·行为 | `use-cases/` | 工作区为主 |
| 逻辑视图 | `logical` | 系统里**有哪些业务概念** | 静态·结构 | `domains/`、仓内 `glossary` | 工作区为主 |
| 实现视图 | `development` | 代码**怎么静态组织的** | 静态·代码 | `architecture/`、仓内 `architecture`/`modules`/`data-models`/`key-implementations` | 仓内为主 + 工作区汇总 |
| 运行视图 | `runtime` | 运行时**发生了什么** | 动态·流程 | 仓内 `flows/`、深流程 | 仓内为主 |
| 契约视图 | `contract` | 跨边界**怎么对话** | 静态·接口 | `contracts/`、仓内 `api-surface` | 工作区为主 |
| 影响视图 | `impact` | 改 X **会炸什么** | 推导·关系 | `depends-on` + 反向双链（查询派生，无常驻页） | 全库（query 即时遍历） |

## 用例视图 vs 逻辑视图（最易混淆，务必分清）

判据：**名词世界 vs 动词世界**。

| | `domains/`（逻辑） | `use-cases/`（用例） |
|---|---|---|
| 回答 | 系统里有哪些业务概念 | 用户/外部系统想完成什么 |
| 性质 | 静态结构 | 动态行为 |
| 单元 | 业务域（订单域、资源域、计费域） | 场景（开通服务、退订、改配） |
| 内容 | 概念、实体、不变量、状态定义、术语、相邻域 | actor、目标、前置、编排了哪些 flow、涉及哪些契约/域、端到端行为弧、验收/判定点 |
| 切法 | **纵切**（按概念领域） | **横切**（按端到端场景，跨多个域） |

一句话：**domain 是列，use-case 是行，flow 是格子里的实现。**

### 用例视图防呆规则（防止退化成 flow 索引）

- use-case 页**只为"多 flow / 跨仓"端到端场景而建**，内容以**编排 + 链接**为主，不复述 flow 内部细节。
- 单个 flow 就能讲完的场景，**不开 use-case 页**，直接给那个 flow 打 `view: usecase`（覆盖默认 `runtime`）。
- use-case 是 agent 的**入口编排层**：`index.md → use-cases/ → (flows / contracts / domains / modules)`。

## type → view 默认映射

`view` 字段默认由 `type` 推出，**只有跨视镜的页才需要显式覆盖**（主要是 flow 可能是 usecase）。

| `type` | 默认 `view` | 可覆盖 |
|---|---|---|
| `use-case` | `usecase` | — |
| `domain` | `logical` | — |
| `glossary` | `logical` | — |
| `module` | `development` | — |
| `architecture` | `development` | — |
| `data-model` | `development` | — |
| `implementation` | `development` | — |
| `config` | `development` | — |
| `flow` | `runtime` | → `usecase`（端到端业务场景） |
| `candidate` | `runtime` | — |
| `runtime-notes` | `runtime` | — |
| `contract` | `contract` | — |
| `api-surface` | `contract` | — |
| `risk` | `impact` | — |
| `index` / `log` | `meta` | — |
| `extra` | `meta` | — |

## 消费侧脊柱（设计自检用）

agent 做需求分析 / 方案设计 / 影响面判断时，热路径应贯穿这条脊柱——任何页面若不在脊柱上、也不被脊柱链接，要质疑它是否该存在：

```
use-cases（入口）
  → domains / contracts（概念 + 接口）
    → flows / modules（实现）
      → depends-on + 反向双链（影响，现算）
        → runtime-notes（警示）
```

> 对 agent 而言目录不是效率杠杆——它靠 **frontmatter 查询 + 双链遍历**导航。
> 真正的消费效率赢在 [frontmatter-schema.md](frontmatter-schema.md)（可查询性）和 [link-contract.md](link-contract.md)（双链强制双向），不在文件夹分类。
