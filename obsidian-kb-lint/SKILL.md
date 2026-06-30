---
name: obsidian-kb-lint
description: "Use to inspect an Obsidian code knowledge base for health issues: missing required pages, orphan notes, stale sources, broken or missing wikilinks, inconsistent claims, weak coverage, or malformed frontmatter. Triggers on 'lint kb', 'health check', '检查知识库', 'find orphan pages', 'stale docs', or 'verify code-kb'."
---

# Obsidian KB Lint

审计知识库健康度，给出可执行的修复项。要应用修复时配合 `obsidian-kb-authoring`。

判定标准全部以 authoring 的 `references/` 为准——结构看 `directory-contract.md`、frontmatter 看 `frontmatter-schema.md`、链接看 `link-contract.md`；`{kb-root}` 定位交给 `obsidian-kb.mjs resolve`。本 skill 不重复声明这些规则，只负责怎么查、怎么报。

先运行 helper；机械约束不要手查：

```bash
node using-obsidian/scripts/obsidian-kb.mjs lint --json
node using-obsidian/scripts/obsidian-kb.mjs report --json
```

`lint` 已覆盖 frontmatter、断链、孤儿、模板 section、link-contract 关系边、partial 契约与 coverage 一致性、candidate-flow 状态、深流程文件夹核心完整性、占位符和省略词。下面只保留脚本结果解释和少量语义补查。

## 检查项

### 1. 结构完整性

每个仓至少要有 `architecture.md`（逻辑视图 + 仓库路由）。其余仓内页**有该关注点才需要**，缺失多数是 `warning` 而非致命：`glossary.md`、`api-surface.md`、`data-models.md`、`config-and-env.md`、`key-implementations.md`、`runtime-notes.md`、`testing-strategy.md`、`candidate-flow.md`、`modules/`（多模块时）、`flows/{分析主题}/`（有业务流程时）。该仓确实没这个关注点，就不算缺。

工作区层至少要有 `index.md`、`log.md`。聚合页 `global/architecture/system-architecture.md`（跨仓真有内容才建）与 `global/architecture/coverage.md`（有多仓或有待接合边时才有意义）都不强制在，单仓初库可缺。依赖图/数据流/技术栈/影响面不物化成页，不要因其缺失而报缺。

### 2. Frontmatter 有效性

对照 authoring `references/frontmatter-schema.md`：

- Tier 1 核心字段齐全：`title`、`type`、`created`、`updated`、`sources`、`confidence`、`status`。
- `type`、`confidence`、`status` 取值在枚举内。
- `sources` 非空（`index`/`log`/`generated` 页例外）。
- 日期合理、不超前。
- **禁用字段要报**：`scope`、把已有字段塞进 tag 的写法（`code-kb/{type}`、`domain/{x}`）、与正文双链各自独立手维护的关系字段。

### 2b. 模板符合度（页面结构）

由 helper 从 `obsidian-kb-authoring/templates/{type}.template.md` 反推必需 section；看 `type: template`、`type: flow-folder`、`type: flow-placeholder`、`type: flow-shortcut` 问题即可。

### 3. 孤儿页

由 helper 报 `type: orphan`。只判断是否为有意入口页或确实需要补链。

### 4. 源码陈旧

逐条 `sources`：

- 源文件是否还存在。
- 有 Git 信息时比对源文件改动时间/状态。
- 源码在页面 `updated` 之后改过的，标为陈旧（应交给 `obsidian-kb-update` 刷新）。

### 5. 一致性

找矛盾：

- 两个模块声称同一独占职责。
- flow 页点名某模块，却没有对应 module 页。
- 模块页 `depends-on` 与正文双链各自漂移、互相矛盾。
- API 页与实际路由/proto 定义冲突。

### 6. 影响边完整性与 partial 契约

由 helper 报 `relation-metadata`、`relation-target`、`relation-body-link`、`reciprocal-link`、`contract-linkage`、`partial-contract`、`partial-coverage`。agent 只需判断这些问题是否应修复、降置信或记录为已知缺口。

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
