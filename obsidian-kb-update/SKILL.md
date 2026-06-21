---
name: obsidian-kb-update
description: Use when existing Obsidian code knowledge-base notes need to be updated after source code changes, changed requirements, or stale documentation. Triggers on "update the kb", "refresh affected wiki pages", "sync docs with code changes", "增量更新知识库", or requests involving changed files and existing code-kb pages.
---

# Obsidian KB Update

增量更新。目标：只动被源码或需求变更影响到的页，别全量重建。

**始终配合 `obsidian-kb-authoring` 写笔记。** 目录、frontmatter、页面形状、链接契约全部以 authoring 的 `references/` 为准，本 skill 不重复声明，只负责更新流程。

## update 在套件里的特殊位置

ingest 和 deep-analysis 增量时**只做加法 + 打 stale**，从不回改旧页。**回头刷新是 update 的专职**（见 authoring `references/directory-contract.md` 的三种维护方式）：

- **自动生成页**（`_map`、`dependency-graph`、`data-flow`、`tech-stack`）：从 frontmatter + 双链**重新投影**，不手写。
- **人工叙事页**（`system-architecture`、`risk-map`、`shared-patterns`、`process-topology`）：之前被打了 `status: stale` 的，由 update **重写刷新**回 `active`。
- **只新增页**（`contracts/`、`domains/`、`use-cases/`）：仍然只在发现新边界/新域/新场景时新增，不回改已有页。

## 更新流程

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
8. 刷新受影响的自动生成页与之前打了 stale 的人工叙事页（见上节）。
9. append 一条精简记录到 `log.md`。

## 影响映射

| 变更类型 | 受影响的页 |
|---|---|
| 路由 / controller / proto | `api-surface.md`、相关仓内 `flows/`、相关 modules |
| TLV / 协议 / message-code / command-code | `contracts/`、`api-surface.md`、`data-models.md`、相关深流程文件夹、`跨边界数据流.md`、`runtime/data-flow.md` |
| MQ topic / producer / consumer | `contracts/`、producer 与 consumer 模块、相关仓内 `flows/`、深流程文件夹、`跨边界数据流.md`、`runtime/data-flow.md` |
| socket / frame / parser / encoder / decoder | `contracts/`、`data-models.md`、深流程文件夹、`跨边界数据流.md`、`runtime-notes.md`、`runtime/data-flow.md` |
| event emit / listen / subscriber | `contracts/`、producer 与 consumer 模块、相关仓内 `flows/`、深流程文件夹、`跨边界数据流.md`、`runtime/data-flow.md` |
| handler registry / dispatch table | `api-surface.md`、相关 `contracts/`、受影响 flow、深流程文件夹、`跨边界数据流.md`、`architecture/dependency-graph.md` |
| RPC client / server / interface | `contracts/`、`api-surface.md`、producer 与 consumer 模块、相关仓内 `flows/`、深流程文件夹、`跨边界数据流.md`、`runtime/data-flow.md` |
| 类型 / 模型 / schema | `data-models.md`、相关 flows 和 modules |
| 配置 / env | `config-and-env.md`、相关 flows |
| 错误 / 重试 / 降级 | `runtime-notes.md`、相关 flows |
| 算法 / 核心服务 | `key-implementations.md`、相关 modules 和 flows |
| 测试 / CI | `testing-strategy.md` |
| 模块边界 / 导出 / 导入 | module 页、`architecture.md`、`architecture/dependency-graph.md` |

通信领域的变更，不要只改本地发送方或接收方一侧的页。工作区里有代码证据时，**两侧都追**：

1. 锁定变更的消息、协议字段、topic、operation code、command ID、route 或 handler 注册。
2. 找发送方的构造/发送逻辑。
3. 找接收方的解码、分发、handler、状态变更、响应、重试、补偿逻辑。
4. 更新每一个还在讲旧跨边界数据流的页。
5. 找不到下游代码时，把受影响的 flow 或契约标 `confidence: low`，记录缺失证据。

## 合并纪律

- 保留人工 prose，除非明显已陈旧。
- 优先定点改，少做整页重写。
- 新代码与旧笔记矛盾时，改笔记并说明变了什么行为。
- 证据不全时降 `confidence`，不要猜。

## 收尾检查

- 受影响的页 `updated` 是当天。
- `sources` 含支撑更新结论的变更文件。
- 链接仍有效、仍相关；新链引到的已有页有反向链。
- 自动生成页已重新投影，之前打 stale 的人工叙事页已刷新。
- `log.md` 记了改了什么、为什么。
