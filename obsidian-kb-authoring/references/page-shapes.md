# 页面形状（Page Shapes）索引

各 `type` 的页面骨架**不再在此内嵌**——骨架的唯一来源是 `obsidian-kb-authoring/templates/{type}.template.md`。本文件只是路由索引：要写哪种页，先 `scaffold {type}` 拿骨架（或直接读对应模板），骨架里的 `<!-- 填:… -->` 内联提示就是过去写在这里的指引。

通用写作规则见 SKILL.md：中文 prose、保留代码标识符原文、结论先行（前三行说清这页为何重要）、一页一主题。所有页面 frontmatter 一律遵循 [frontmatter-schema.md](frontmatter-schema.md)。

## 页型索引

| 页型(type) | 用途一句话 | 模板 | 刚性边界（lint 校验必需 section） |
|---|---|---|---|
| `use-case` | 跨仓端到端业务场景，编排 + 链接为主（单 flow 场景不开此页） | `templates/use-case.template.md` | 前置条件 / 端到端编排 / 涉及业务域 / 关键判定点 / 风险链 |
| `domain` | 业务域概念字典 | `templates/domain.template.md` | 核心概念 / 实体与状态 / 相邻域 / 实现该域的流程 |
| `contract` | 跨边界契约，定义一次被多 flow 引用 | `templates/contract.template.md` | 消息/接口标识 / Payload Schema / Producer / Consumer / 接收方发现证据 / 使用该契约的流程 |
| `coverage` | 工作区覆盖度/前沿账本（唯一、只追加） | `templates/coverage.template.md` | 仓库覆盖度 / 悬挂的跨仓边 / 已知盲区 |
| `module` | 单模块职责 + 依赖（多实例） | `templates/module.template.md` | 职责 / 公共接口 / 依赖（出）/ 被依赖（入·反向链接）/ 相关流程 |
| `architecture` | 仓库实现视图 + 路由 + 架构图（system-architecture 复用此模板，落点为工作区） | `templates/architecture.template.md` | 架构图 / 分层与职责 / 核心模块 / 关键流程入口 / 对外契约·数据 / 设计模式 |
| `candidate` | 次关键流程候选清单 | `templates/candidate-flow.template.md` | Deep Analysis 候选流程清单 |
| `glossary` | 仓内术语表 | `templates/glossary.template.md` | 术语 |
| `api-surface` | 仓内对外接口面 | `templates/api-surface.template.md` | 对外接口 |
| `data-model` | 仓内核心数据结构 | `templates/data-models.template.md` | 核心结构 |
| `config` | 仓内配置与环境 | `templates/config.template.md` | 关键配置项 |
| `runtime-notes` | 仓内运行注记（错误/重试/陷阱） | `templates/runtime-notes.template.md` | 错误处理与重试 / 已知陷阱·地雷 |
| `implementation` | 仓内关键实现点 | `templates/key-implementations.template.md` | 关键实现点 |
| `extra` | 不属于标准页型的补充页 | `templates/extra.template.md` | 正文 |
| `flow`（深流程6件套） | deep-analysis 产物，一文件夹6件 | `templates/flow/{调用树,主干流程,分支主题,跨边界数据流,数据结构,自查报告}.template.md` | 各文件见模板内 `## section` |

## 几条不在模板里、但要记住的语义约定

- **契约「定义一次」**：契约页持有可复用定义（schema、标识、producer/consumer）；flow 的跨边界页只持有「本场景如何用」并链回契约，不重抄 schema。
- **单边契约（`status: partial`）**：增量时只找到一端就照常建页，已知一端填上、未知一端留空写「对端待 ingest」，`status: partial`，同时在 `coverage.md` 悬挂边表挂账。对端仓 ingest 后补全 + 双链，`status` 翻回 `active`、账本行翻「已接合」。用 `scaffold contract --partial` 可一条命令原子完成建页 + 挂账。
- **coverage 只追加不改写**：接合一条悬挂边 = 把该行状态改 `已接合` + 补全关联 partial 契约的对端与双链，是状态翻转，不是重写整页。
- **深流程「定义一次、引用多次」**：`跨边界数据流` 收发两节都必须填；可复用 schema/标识提升到 `contracts/`，完整字段定义提升到 `repos/{repo}/data-models`，深流程页只留场景特定内容 + 时序/生命周期。
- **system-architecture 是工作区唯一人工叙事总览**（复用 architecture 模板，含跨仓 mermaid 图）；增量早期常常还不存在，缺席是正常的。依赖图/技术栈/数据流/影响面**不物化成页**——由 query 现算。
