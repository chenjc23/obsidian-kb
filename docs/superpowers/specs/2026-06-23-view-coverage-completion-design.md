# 设计：补全 deep-analysis 视图覆盖 + 单仓架构层规则

- 日期：2026-06-23
- 范围：`obsidian-kb` 技能套件文档层（不涉及代码）
- 目标读者：实现本设计的 agent / 维护者

## 背景与问题

知识库套件按六视图（用例 / 逻辑 / 实现 / 运行 / 契约 / 影响）组织，增量铁律是
"ingest / deep-analysis 只做加法 + 打 stale，回头刷新交给 update"。但这条铁律只写在
`directory-contract.md` 和各 skill 开头的一句话里，**只有契约视图（contracts）和数据/实现
视图（data-models）在 deep-analysis 的 Phase 正文里被真正操作化**。其余视图的"加法 / 打 stale"
动作没有落到具体 Phase，于是实际执行时被漏掉。

### 问题一：deep-analysis 视图覆盖不全

deep-analysis 当前显式处理：

- 契约视图 ✅ Phase 3 契约提升 → `contracts/{X}.md`
- 数据/实现视图 ✅ Phase 4 结构提升 → `data-models.md`

未显式处理：

- 逻辑视图 `domains/` ❌ —— 深挖常暴露新业务概念/不变量/状态，却无"发现新域就新增 domain 页"动作
- 用例视图 `use-cases/` ❌ —— 用例种子只写在 ingest 的 Phase 8；独立跑 `/obsidian-kb-deep-analysis`
  根本不触发
- 影响视图 `impact/risk-map` ❌ —— 低置信缺口/高风险只进 `自查报告.md`，没喂 risk-map、没打 stale
- 实现汇总 `architecture/system-architecture` ❌ —— 增量铁律说"打 stale"，但正文无一处明确指示

### 问题二：单仓 ingest 时工作区 `architecture/` 聚合层

整个 `architecture/` + `runtime/` 工作区目录被设计成**跨仓汇总**。单仓时：

- `system-architecture.md` 与 `repos/{repo}/architecture.md` 高度重叠 → 冗余
- `dependency-graph.md` / `tech-stack.md` —— 单仓也能投影，但没说该不该退化
- 缺一条总规则："单仓时工作区聚合层如何取舍"当前完全没写，默认假设多仓

两个问题是同一根因的两面：**增量铁律没有在 deep-analysis 正文与目录契约里被完整操作化。**

## 设计原则

1. **不发明新概念、不重排 Phase、不引入 mode 标志。** 全部是把已有契约操作化的定点加法式小改。
2. **复用既有的"打 stale → update 刷新"流水线。** 单仓→多仓不是一次特殊迁移，而是普通的 stale 刷新。
3. **聚合/编排页的存在判据是实质，不是数量。** 数量（≥2 单元）只是必要前置，不是充分条件；
   跨切内容为空就不建空壳页。

## 总原则（写进 directory-contract，三块共用）

> **聚合/编排页（`use-cases`、`system-architecture`、`shared-patterns`、`process-topology`）
> 的存在判据 = "是否存在被其聚合的单元页无法表达的跨切内容"。数量（≥2 单元）只是必要前置，
> 不是充分条件；跨切内容为空 → 不建空壳页，只在单元页上打 tag / 留指针。**

## 改动清单

### 块 1 · deep-analysis 补全视图覆盖

文件：`obsidian-kb-deep-analysis/SKILL.md`

**1a. 新增一个轻量 Phase（紧接 Phase 4 之后）：「逻辑域与用例收尾（只新增）」**

- 逻辑视图：本次深挖暴露出 ingest 未识别的业务域 / 不变量 / 状态 → **只新增** `domains/{X}.md`，
  与深流程双链。已存在的域不回改。
- 用例视图：默认只给端到端深流程打 `view: usecase`（已有规则，明确写死）；
  **仅当本次深挖产出一条单个 flow 页装不下的端到端编排弧**（有明确 actor/目标/前置、跨多个 flow
  或跨仓，例如 Phase 3 跨边界把发送方 + 接收方主干都追出来）→ **只新增** `use-cases/{X}.md`
  （编排 + 链接为主，不复述 flow 内部细节）。判据是实质（"单 flow 页装不下的编排弧"），
  跨 ≥2 flow 只是必要前置；两个孤立 flow → 只打 tag，不开页；已存在则不回改。

**1b. 扩 Phase 5 自查报告 + log 清单**

- 受本次深挖影响的人工叙事聚合页（`architecture/system-architecture`、`impact/risk-map`）
  → **打 `status: stale`**（一个标记，不重写）。
- 低置信 / 高风险缺口同时记入 `自查报告.md`，并在 `log.md` 标注喂给 risk-map。

净效果：deep-analysis 对六视图动作变完整——契约/数据 = 提升，逻辑/用例 = 只新增，
影响/实现汇总 = 打 stale。全部是现有契约里早已写好、只是没落到正文的动作。

### 块 2 · 独立跑 deep-analysis 的用例种子

即块 1a 的"用例视图"条。它让 `use-cases` 不再只依赖 ingest 的 Phase 8——独立跑 deep-analysis
也能在该开页时只新增。ingest Phase 8 用例种子保留不变，二者用**同一实质判据**
（"单 flow 页装不下的端到端编排弧"），不冲突、不重复建（已存在则不回改）。

### 块 3 · 单仓 / 少仓架构层退化

文件：`obsidian-kb-authoring/references/directory-contract.md`，在"三种维护方式"附近加短小节
「单仓 / 少仓退化」：

- **自动生成页**（`dependency-graph` / `tech-stack` / `data-flow`）：**不受仓数影响**，永远照常投影，
  单仓即单仓投影。无退化、无冗余处理。
- **人工叙事聚合页**（`system-architecture` / `shared-patterns` / `process-topology`）：
  **"≥2 仓且有真跨仓内容"才建**——"有真跨仓内容"指存在单仓 `architecture.md` 表达不了的
  跨仓依赖边 / 共享契约 / 跨仓数据流。≥2 仓只是必要前置；跨仓内容为空 → 不建空壳。
  单仓时 `index.md` 实现视图入口直接指向 `repos/{repo}/architecture.md`。
- **跨入 ≥2 仓**：ingest 建 `status: stale` 空种子页，update 刷成真汇总——走既有 stale/refresh
  循环，无迁移、无 mode 标志、无新 update 逻辑。

文件：`obsidian-kb-ingest/SKILL.md` Phase 7 加一行：单仓不建 `system-architecture`；
当本次 ingest 使仓数跨到 ≥2 且该页不存在时，建 `status: stale` 种子。

### 块 4 · update 衔接

文件：`obsidian-kb-update/SKILL.md`

update 已写"刷新之前打 stale 的人工叙事页"，块 1/块 3 打的 stale 正好落进其现有职责，逻辑不改。
仅加一行点明：刷新 `system-architecture` 时遵守单仓阈值（< 2 仓或无真跨仓内容则保持不建 / 薄指针）。

## 改动总量

4 个文件，全部加法式小段落，无重写、无删除现有 Phase。最大一处是 deep-analysis 约 6 行的新 Phase。

| 文件 | 改动 |
|---|---|
| `obsidian-kb-deep-analysis/SKILL.md` | 新增「逻辑域与用例收尾」Phase；扩 Phase 5 自查/log 清单 |
| `obsidian-kb-authoring/references/directory-contract.md` | 加总原则一句 + 「单仓/少仓退化」短小节 |
| `obsidian-kb-ingest/SKILL.md` | Phase 7 加一行 system-architecture 阈值/种子规则 |
| `obsidian-kb-update/SKILL.md` | 加一行 system-architecture 刷新遵守单仓阈值 |

## 非目标（YAGNI）

- 不引入仓数 / 流程数的持久 mode 字段或状态机。
- 不为单→多仓写专门的迁移流程。
- 不改自动生成页（`dependency-graph`/`tech-stack`/`data-flow`）的投影逻辑。
- 不重排或删除任何现有 Phase。

## 验收标准

- deep-analysis 正文对六视图均有明确动作：契约/数据=提升，逻辑/用例=只新增（带实质判据），
  影响/实现汇总=打 stale。
- 独立跑 deep-analysis 在产出"单 flow 装不下的编排弧"时能只新增 use-case 页，不依赖 ingest。
- directory-contract 含"聚合页存在=实质判据，非数量"总原则，以及单仓退化小节。
- ingest Phase 7、update 各含一行 system-architecture 阈值/种子规则，互相衔接无断点。
- 单仓 ingest 不产生冗余 `system-architecture`；加第二仓走 stale→update 刷新，无特殊迁移。
