---
name: obsidian-kb-update
description: Use when existing Obsidian code knowledge-base notes need to be updated after source code changes, changed requirements, or stale documentation. Triggers on "update the kb", "refresh affected wiki pages", "sync docs with code changes", "增量更新知识库", or requests involving changed files and existing code-kb pages. Also triggers when the user supplies external knowledge or a document (design note, spec, chat log, PDF) to fold into the KB — e.g. "把这份文档整理进知识库", "把这段知识沉淀进库", "update kb from this doc".
---

# Obsidian KB Update

增量更新。目标：只动被影响到的页，别全量重建。

**两种输入模式**：A·源码变更（git diff 驱动）；B·外部知识/文档输入（用户给一段知识或文档，理解后关联到相关页）。先做「输入识别」判定本次走哪条，二者可在同一次调用并存。

**始终配合 `obsidian-kb-authoring` 写笔记。** 目录、frontmatter、页面形状、链接契约全部以 authoring 的 `references/` 为准，本 skill 不重复声明，只负责更新流程。找 `{kb-root}` 见 authoring `references/kb-root-resolution.md`。

## update 在套件里的特殊位置

ingest 和 deep-analysis 增量时采用追加式写入，从不回改旧页，也**不碰** `system-architecture`。update 负责刷新已有页面和接合状态（见 authoring `references/directory-contract.md` 的两种维护方式）：

- **人工叙事页**（仅 `system-architecture`）：本轮变更若动到**跨仓结构**（新增/删除仓、新跨仓契约、顶层子模块迁移），由 update **直接重写刷新**；否则不动它。无需任何 stale 标记——变更集本身就是信号。
- **只新增页**（`global/contracts/`、`global/domains/`、`global/use-cases/`）：仍然只在发现新边界/新域/新场景时新增，不回改已有页。
- **覆盖记录**（`global/architecture/coverage.md`）：update 负责**接合待接合边**——当某次变更或新 ingest 让 `status: partial` 契约的对端浮现，补全对端两端 + 双向链接、`status` 翻回 `active`、把对应记录行翻成"已接合"。仓挖深了（地形扫描→子模块已解析→流程已深挖）也在此刷新覆盖度行。这是状态翻转，不是综合改写。

依赖图 / 数据流 / 技术栈 / 影响面**不物化成页**，不进刷新循环——由 query 从 `depends-on` + 反向双链即时遍历得出。

## 输入识别（双模式）

- 用户给的是**代码变更**（git diff/status、文件名、patch）→ 走**模式 A**（下方「模式 A：源码变更驱动」）。
- 用户给的是**外部知识/文档**（粘贴文本、文档路径、URL、聊天记录、设计稿）→ 走**模式 B**（下方「模式 B：外部知识/文档输入」）。
- 两者都给 → 两条流程各跑一遍，落页时合并。

## 模式 A：源码变更驱动

### 更新流程

1. 找出变更的源文件。
   - 优先用 Git diff/status。
   - 用户给了文件名或 patch，就以那个为变更集。
2. 把变更文件映射到现有页。
   - 搜 `sources` frontmatter。
   - 搜正文里的代码引用。
   - 用 `index.md` 和仓库 `architecture.md`（仓库路由）定位受影响区域。
3. 重读变更源码及邻近上下文。
4. 只改受影响的页。
5. 判断变更是否产生跨仓影响。
6. 刷新 `updated`、`sources`、`confidence`。
7. 维护或修复双链（见 authoring `references/link-contract.md`，关系字段与正文双链保持一致）。
8. 本轮变更若动到跨仓结构，直接重写刷新 `global/architecture/system-architecture.md`（见上节）；否则不动。
9. **接合待接合边**：变更若让某 `partial` 契约的对端浮现，补全对端 + 双向链接、`status` → `active`、`global/architecture/coverage.md` 对应行 → "已接合"（见上节）。
10. append 一条精简记录到 `log.md`。

### 影响映射

| 变更类型 | 受影响的页 |
|---|---|
| 路由 / controller / proto | `api-surface.md`、相关仓内 `flows/`、相关 submodules |
| TLV / 协议 / message-code / command-code | `global/contracts/`、`api-surface.md`、`data-models.md`、相关深流程文件夹、`跨边界数据流.md` |
| MQ topic / producer / consumer | `global/contracts/`、producer 与 consumer submodule/overview、相关仓内 `flows/`、深流程文件夹、`跨边界数据流.md` |
| socket / frame / parser / encoder / decoder | `global/contracts/`、`data-models.md`、深流程文件夹、`跨边界数据流.md`、`constraints.md` |
| event emit / listen / subscriber | `global/contracts/`、producer 与 consumer submodule/overview、相关仓内 `flows/`、深流程文件夹、`跨边界数据流.md` |
| handler registry / dispatch table | `api-surface.md`、相关 `global/contracts/`、受影响 flow、深流程文件夹、`跨边界数据流.md` |
| RPC client / server / interface | `global/contracts/`、`api-surface.md`、`api-depend.md`、producer 与 consumer submodule/overview、相关仓内 `flows/`、深流程文件夹、`跨边界数据流.md` |
| 类型 / 模型 / schema | `data-models.md`、相关 flows 和 submodules |
| 配置 / env / feature flag | `specifications.md`、相关 flows |
| 错误 / 重试 / 降级 | `constraints.md`、相关 flows |
| 资源占用 / 容量 / 退化 | `resource-analysis.md`、相关 flows |
| 算法 / 核心服务 | `submodules/{topic}/功能.md`、相关 flows |
| 子模块边界 / 导出 / 导入 | `overview.md`、相关 `submodules/{topic}/`、`architecture.md` |

通信领域的变更，不要只改本地发送方或接收方一侧的页。工作区里有代码证据时，**两侧都追**：

1. 锁定变更的消息、协议字段、topic、operation code、command ID、route 或 handler 注册。
2. 找发送方的构造/发送逻辑。
3. 找接收方的解码、分发、handler、状态变更、响应、重试、补偿逻辑。
4. 更新每一个还在讲旧跨边界数据流的页。
5. 找不到下游代码时，把受影响的 flow 或契约标 `confidence: low`，记录缺失证据。

## 模式 B：外部知识/文档输入

用户给一段外部知识或文档，理解后识别相关联的 KB 页并更新。映射靠**语义主题**（实体/业务词/域/契约/流程），不是文件路径；纯用 `rg` + frontmatter 检索，不引入向量库/embedding。

### 流程

1. **摄取与理解**：读入外部输入（粘贴文本 / 文档路径 / URL；URL 用 WebFetch，拿不到就请用户贴内容）。提炼它主张了哪些知识点、涉及哪些实体/域/契约/流程/约束。
2. **关联映射**：用 `rg` 在现有页的标题、别名、`glossary`、frontmatter、正文里搜上述实体/主题，产出**相关页候选集**。证据不足时去读源码或既有页补足理解（只读、不臆测）。
3. **冲突收集**：逐个候选页比对——凡外部知识与页上「代码提炼」内容**矛盾**，登记一条冲突（页面 · 现有说法 · 外部说法 · 各自来源）。不矛盾的标记为「可直接补充」。
4. **一次性询问用户**：遍历完，把**全部冲突攒齐一次列给用户**，逐条请其裁决以哪边为准。**不自动覆盖**。无冲突时跳过本步。
5. **三层落页**（按裁决结果）：
   - **① 改相关现有页**：合并新知识；矛盾处按用户裁决落笔；刷新 `updated`、`sources`、`confidence`。
   - **② 新增视图层页**：文档揭示新业务域→`global/domains/{X}`、新契约→`global/contracts/{X}`、新用例→`global/use-cases/{X}`，遵循「只新增、不回改已有页」。
   - **③ 辅助页 `extra/{标题}.md`**：仅当这条知识与现有库**毫无关联**、且补齐 ② 后仍**无页能承载**时才建。`type: extra`、`repo: global`。能进五视图的不许塞这里。
6. **溯源 + 双链 + 日志**：`sources` 记外部来源（文档路径/URL，或 `external: {简述} ({日期})`）；按来源权威度定 `confidence`；维护双链（见 authoring `references/link-contract.md`，extra 页也须至少一条接入脊柱）；append `log.md`。

### 冲突裁决原则

外部知识与代码提炼内容矛盾时**不预设谁赢**，交用户裁决。提示用户判断时可参考：实现事实通常以代码为准，意图/需求/业务规则/约束这类代码表达不了的通常以外部文档为准——但**最终以用户裁决为准**，并把结论写进页面、矛盾来源记入 `sources`。

## 合并纪律

- 保留人工 prose，除非明显已陈旧。
- 优先定点改，少做整页重写。
- 新代码与旧笔记矛盾时，改笔记并说明变了什么行为。
- 证据不全时降 `confidence`，不要猜。

## 收尾检查

收工前逐条过，缺一条就回去补：

- 受影响的页 `updated` 是当天。
- `sources` 含支撑更新结论的变更文件（不带行号的 durable 引用）。
- 链接仍有效、仍相关；新链引到的已有页有反向链 → 见 references/link-contract。
- 跨仓结构有变则 `global/architecture/system-architecture.md` 已直接刷新（没动到跨仓结构则保持原状）。
- 对端已浮现的 `partial` 契约已接合（补全两端 + `global/architecture/coverage.md` 行翻"已接合"）；仍待接合的留 `partial` 不强接。
- `log.md` 记了改了什么、为什么。
