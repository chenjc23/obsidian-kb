---
name: obsidian-kb-lint
description: "Use to inspect an Obsidian code knowledge base for health issues: missing required pages, orphan notes, stale sources, broken or missing wikilinks, inconsistent claims, weak coverage, or malformed frontmatter. Triggers on 'lint kb', 'health check', '检查知识库', 'find orphan pages', 'stale docs', or 'verify code-kb'."
---

# Obsidian KB Lint

审计知识库健康度，给出可执行的修复项。要应用修复时配合 `obsidian-kb-authoring`。

判定标准全部以 authoring 的 `references/` 为准——结构看 `directory-contract.md`、frontmatter 看 `frontmatter-schema.md`、链接看 `link-contract.md`、找 `{kb-root}` 看 `kb-root-resolution.md`。本 skill 不重复声明这些规则，只负责怎么查、怎么报。

机械检查（frontmatter 合法性、断链、孤儿、统计）可用 `using-obsidian/scripts/obsidian-kb.mjs lint` / `report` 跑一遍；脚本不可用时按下面逐项手查。

## 检查项

### 1. 结构完整性

每个仓至少要有 `overview.md`（模块定义、职责边界、上下文）和 `architecture.md`（逻辑视图 + 仓库路由）。其余仓内页**有该关注点才需要**，缺失多数是 `warning` 而非致命：`glossary.md`、`api-surface.md`、`api-depend.md`、`data-models.md`、`specifications.md`、`constraints.md`、`resource-analysis.md`、`human-interfaces.md`、`candidate-flow.md`、`usecases/`、`submodules/`（多子模块时）、`flows/{分析主题}/`（有业务流程时）。该仓确实没这个关注点，就不算缺。

工作区层至少要有 `index.md`、`log.md`。聚合页 `global/architecture/system-architecture.md`（跨仓真有内容才建）与 `global/architecture/coverage.md`（有多仓或有待接合边时才有意义）都不强制在，单仓初库可缺。依赖图/数据流/技术栈/影响面不物化成页，不要因其缺失而报缺。

### 2. Frontmatter 有效性

对照 authoring `references/frontmatter-schema.md`：

- Tier 1 核心字段齐全：`title`、`type`、`created`、`updated`、`sources`、`confidence`、`status`。
- `type`、`confidence`、`status` 取值在枚举内。
- `sources` 非空（`index`/`log`/`generated` 页例外）。
- 日期合理、不超前。
- **禁用字段要报**：`scope`、把已有字段塞进 tag 的写法（`code-kb/{type}`、`domain/{x}`）、与正文双链各自独立手维护的关系字段。

### 2b. 模板符合度（页面结构）

页面结构的唯一来源是 `obsidian-kb-authoring/templates/{type}.template.md`（见 directory-contract「单一来源纪律」）。脚本 `lint` 会从对应模板反推必需 `## section`，缺失则报 `warning`（`type: template`）。手查时：拿页面 `type` 对应的模板，核对正文 `## 标题` 覆盖了模板里非 `<!-- optional -->` 的刚性 section。`flow` 深流程文件夹各页形状见 `page-shapes.md`，不在此机械校验。

### 3. 孤儿页

找没有入链的页。`index.md`、`log.md` 这类入口排除。

### 4. 源码陈旧

逐条 `sources`：

- 源文件是否还存在。
- 有 Git 信息时比对源文件改动时间/状态。
- 源码在页面 `updated` 之后改过的，标为陈旧（应交给 `obsidian-kb-update` 刷新）。

### 5. 一致性

找矛盾：

- 两个子模块声称同一独占职责。
- flow 页点名某子模块，却没有对应 `submodules/{topic}/上下文.md`。
- overview/submodule 页 `depends-on` 与正文双链各自漂移、互相矛盾。
- API 页与实际路由/proto 定义冲突。

### 6. 影响边完整性（影响分析的关键）

这几条是影响面计算的图的边，缺一条就静默漏报（见 authoring `references/link-contract.md`）：

- 契约页缺 `producer` 或 `consumer` → 影响传播断裂。**例外**：`status: partial` 契约允许单边（见下条校验）。
- overview/submodule 页缺 `depends-on` → 依赖链断裂。
- flow 页缺 `entry-point` 或 `related-contracts` → 变更点回溯不到流程。
- 单向链：A 链了 B，B 没有反向链回 A（glossary 索引等明确单向场景除外）。

### 6b. 单边契约与待接合边一致性（coverage 记录）

`status: partial` 是增量缺口的合法表达，但**必须记录并可校验**，否则缺口就静默了：

- 每个 `status: partial` 契约**必须**在 `global/architecture/coverage.md` 待接合边表有对应行 → 缺行报 `warning`（缺口未记录）。
- 反之，coverage 待接合边表里关联到契约页的行，目标契约页必须存在且确为 `partial` → 断链或已 `active` 却仍标为待接合报 `warning`（该接合未接合）。
- 两端都齐全的契约不该停在 `partial`：`producer` 和 `consumer` 都非空却仍 `status: partial` → 报 `warning`（状态未更新，应翻 `active` 并接合记录行）。
- coverage 覆盖度表引用的仓应在 `repos/` 下存在。

### 7. 覆盖

找重要源码目录没被任何页提及：入口、controller/路由、服务/领域模块、模型/schema、配置/基础设施、测试。

## 报告格式

```markdown
# 知识库健康检查

## 总结
- 状态：通过 / 有警告 / 需要修复
- 仓库数：N
- 页面数：N
- 主要风险：{一句话}

## 问题列表
| 严重级别 | 类型 | 位置 | 问题 | 建议动作 |
|---|---|---|---|---|

## 孤立页面
{或"无"}

## 陈旧页面
{或"无"}

## 覆盖缺口
{或"无"}

## 建议修复顺序
1. {影响最大的修复}
```

## 应用修复

只有用户要求修复、或当前请求本身就包含修复时才写文件。修复时：

- 保留人工编辑。
- 优先补链接和元数据，少做整页重写。
- 实质性改动记入 `log.md`。
