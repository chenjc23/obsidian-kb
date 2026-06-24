---
name: obsidian-kb-authoring
description: Use whenever creating, editing, or reviewing multi-repository Obsidian code knowledge-base pages. Defines the code-kb knowledge engineering contract — six-view model, directory layout, frontmatter schema, page shapes, source evidence, confidence/status, and the bidirectional link contract. Applies Obsidian syntax through obsidian-markdown.
---

# Multi-Repository Obsidian Code KB Authoring

这是 `code-kb/` 的知识工程**宪法**。任何写入知识库的 skill 都必须遵守本契约。

写笔记时：

1. 用 `obsidian-markdown` 处理 Obsidian 语法。
2. 用本 skill 处理多仓代码知识库的结构、元数据、视图与链接契约。

## 方法论：六视图

知识库按软件架构 **4+1 视图**改造为六视图（去部署、加契约/影响）：**用例 / 逻辑 / 实现 / 运行 / 契约 / 影响**。

视图是**完整性透镜 + 页面查询维度**，不是物理目录。物理布局双层切（工作区 catalog + 仓内扁平），视图维度靠 frontmatter `view:` 承载。

## 参考文件（写入前必查）

本 skill 的细节拆到 `references/`，写入前按需查阅对应文件，**不要凭记忆**：

| 文件 | 内容 | 何时查 |
|---|---|---|
| [references/view-model.md](references/view-model.md) | 六视图定义、domain/use-case 名词动词之分、type→view 映射、消费侧脊柱 | 决定页面归属哪个视图、用例 vs 域分不清时 |
| [references/directory-contract.md](references/directory-contract.md) | 锁定目录树、folder/file 判据、两种维护方式、增量铁律 | 决定文件放哪、是否新建/合并页、增量该不该改某页 |
| [references/frontmatter-schema.md](references/frontmatter-schema.md) | **唯一** frontmatter schema、三档字段、枚举、去重去冗余 | 每次写 frontmatter |
| [references/page-shapes.md](references/page-shapes.md) | 各 type 页面骨架、深流程瘦身后的形状 | 每次新建页面 |
| [references/link-contract.md](references/link-contract.md) | 双链强制双向、影响视图传播边、可校验字段 | 每次建立关系、做影响分析 |
| [references/kb-root-resolution.md](references/kb-root-resolution.md) | 找知识库根 `{kb-root}` 的确定性解析顺序、读写兜底 | 每次需要定位或新建知识库根 |

> 其它 skill（ingest / deep-analysis / update）**不得自行重新声明 schema 或目录**，一律引用上述参考文件——单一来源确保各 skill 的产物一致。

## 不可妥协的约束

无论写哪种页面，以下为硬约束：

1. **frontmatter 唯一来源**：字段、枚举、默认值全部以 `references/frontmatter-schema.md` 为准。Tier 1 核心字段每页必含；`updated` 写入时刷新为当天。
2. **双链强制双向**：`references/link-contract.md` 列出的关系必须双向可达。`producer`/`consumer`/`depends-on` 是影响视图的图边，必须存在且可校验。关系的唯一真相源是正文 wikilinks，frontmatter 关系字段是工具同步的投影。
3. **增量只做加法 + 打 stale**：增量阶段（ingest/deep-analysis）只写仓内页、新增只新增页、给受影响的人工叙事页打 `status: stale`、append `log.md`；**不**全量重建工作区地图（那是 update 的活）。见 `references/directory-contract.md` 两种维护方式。
4. **源码证据诚实**：`sources` 用 durable 引用（`path:func()`，**不带行号**）。证据不足时设 `confidence: low`，在正文说明缺失，**不编造行为**。

## 写作规则

- 知识 prose 默认中文。
- 代码标识符、文件路径、API 名、协议名、库名、技术术语保持原文拼写。
- 结论先行：前三行让 agent 明白这页为何重要。
- 一页一主题。过大的 flow/module 页要拆，不要堆成不可读的巨页（folder/file 判据见目录契约）。
- 尊重人工内容：合并或追加，不覆盖。

## 写入前最终检查

- Tier 1 核心 frontmatter 齐全，`view` 正确（默认由 type 推，跨视镜才覆盖）。
- `updated` 是当天。
- `sources` 列真实证据，或正文说明为何缺失。
- 关系双链双向闭环（见 link-contract）；新页至少一条入链或是有意的入口页。
- 该打 `stale` 的人工叙事页已打标记，未被误重写。
- `log.md` 记录了有意义的写操作。
