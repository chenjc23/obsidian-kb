# 目录契约（Directory Contract）

知识库根目录 `{kb-root}`（默认 `{workspace-root}/code-kb`）的物理布局。

组织原则（详见 [view-model.md](view-model.md)）：

1. **双层按作用域切**：工作区层（跨仓 catalog）+ 仓库层（仓内细节）。
2. **工作区层：顶层目录 ≈ 视图 catalog**。
3. **仓库层：不复刻视图文件夹，保持扁平**；视图维度由页面 `type` 派生。
4. **folder vs 单文件判据**：每实例是"独立大页"→ 文件夹；实例小而多 → 单文件分 section，大到撑不住再拆文件夹。
5. **视图不必平均分配目录**：按该视图"持久手写内容"多少加权。影响/运行视图**不物化成工作区页**——影响靠 query 即时遍历、运行活在仓内 flows/。

## 单一来源纪律

四类规则各有唯一权威来源，别处一律引用、不复述，防止多份定义漂移：

| 规则 | 唯一来源 | 怎么用 |
|---|---|---|
| **页面结构**（每页有哪些 section） | `obsidian-kb-authoring/templates/{type}.template.md` 真模板文件 | 新建页优先 `scaffold {type}` 生成页面骨架；lint 从模板反推必需 section；改结构改模板 |
| **frontmatter 字段/枚举/默认值** | [frontmatter-schema.md](frontmatter-schema.md) | 每次写 frontmatter 查它 |
| **目录路径/落点** | `registry.yaml` 的 `types.*.target`（`describe tree` 看全树） | 决定文件落点查它；改落点改注册表 |
| **放哪/是否新建/维护方式** | 本文件（directory-contract.md 叙事部分） | 取舍判断、增量约束查它 |
| **双链关系/影响传播边** | [link-contract.md](link-contract.md) | 每次建关系、做影响分析查它 |

> 其它 skill（ingest / deep-analysis / update / lint）**不得重新声明**结构、字段、路径或关系，只引用上述来源。

## 目录树

目录结构由 `registry.yaml` 的 `types.*.target` 决定（落点唯一来源）。要看完整目录树运行：

```bash
node using-obsidian/scripts/obsidian-kb.mjs describe tree
```

`{title}`/`{repo}`/`{topic}` 为占位。视图归属、增量"只新增不改旧"、三种维护方式等叙事见下方 `页面取舍` / `维护方式`。

树中**不出现**的文件或目录：依赖图、技术栈、影响面（不物化成页，由 query 现算）。旧 `modules/`、`config-and-env.md`、`key-implementations.md`、`runtime-notes.md` 不再是目录契约的一部分，内容分别迁入 `overview/submodules`、`specifications`、`submodules/flows`、`constraints/resource-analysis`。

### 页面取舍

- 工作区层全部住在 `global/` 下（`global/use-cases/`、`global/domains/`、`global/contracts/`、`global/architecture/`、`global/extra/`），对应 frontmatter `repo: global`；`index.md`/`log.md`/`repos/` 与 `global/` 并列。
- 跨仓关注点不单独成页：接口归 `global/contracts/`，仓内对外接口归 `api-surface.md`，本仓依赖外部接口归 `api-depend.md`，风险与资源约束归 `constraints.md` / `resource-analysis.md`，依赖与影响范围由 query 从 `depends-on` + 反向双链现算（不落页）。
- `global/architecture/coverage.md` 是工作区唯一的**覆盖记录**：记录每仓挖到什么深度、哪些跨仓边只找到一端还没接上、有哪些已知盲区。它让"增量永远不完整"变成可读的待补地图——agent 建立全局认识时必读，知道哪里能下结论、哪里是盲区。只追加，不做综合改写。
- 跨仓边只先找到一端时建**单边契约**（`global/contracts/{X}` 标 `status: partial`），并在 `coverage.md` 待接合边表记录；等另一端的仓 ingest 进来再接合，不编造假对端。
- `glossary` 是术语→链接索引，不存第二份定义。
- `overview.md` 是仓内模块定义、职责边界、上下文入口；具体模块细节进入 `submodules/{topic}/子模块设计.md` 与 `子模块约束.md`。
- `specifications.md` 合并规格、配置和 feature flag；错误处理、设计约束、隐式约定进入 `constraints.md`，资源消耗、容量和退化策略进入 `resource-analysis.md`。
- `global/extra/` 是**最后手段**：仅当一条外部知识与现有库毫无关联、且补齐 `global/domains/`、`global/contracts/`、`global/use-cases/` 视图层页后仍无页能承载时，才建 `global/extra/{标题}.md`。能进五视图的知识不许塞 `extra/`。
- 仓内不复刻视图文件夹；只有 `usecases/`、`submodules/`、`flows/` 这类多实例单元才成文件夹。

## 工作区页面的维护方式（决定增量刷新行为）

工作区聚合页不能都当手写页，否则每次增量补仓都要回头改一堆，迟早不一致。按维护方式分三种：

| 维护方式 | 哪些页 | 增量时怎么处理 |
|---|---|---|
| **只新增 + 最小接线**（发现新的加一页，已有页不重写叙事） | `global/contracts/{X}`、`global/domains/{X}`、`global/use-cases/{X}` | 发现新的就**新增一页**；已有页只允许追加证据支撑的反向链接、使用者列表或状态接合，不做综合改写 |
| **只追加**（覆盖记录，记已知盲区） | `global/architecture/coverage.md` | **append 一行**：新挖的仓登记深度、新发现的待接合边；接上一端时把对应行翻成"已接合"，不综合改写 |
| **人工叙事**（需人工综合判断） | `global/architecture/system-architecture.md` | 增量时**不碰**；由 `obsidian-kb-update` 在跨仓结构变化时**直接重写刷新** |

依赖图 / 技术栈 / 数据流 / 影响面**不物化成页**：它们是 `depends-on` + 双链的派生物，由 query 即时遍历回答，永远 fresh，不进维护循环。

> **全局认识 = coverage 基础入口 + query 现算 +（可选）system-architecture，不是单个聚合页**。agent 要全工程视角时按这个顺序读：
> 1. **`coverage.md`（基础入口,恒在）**：从第一个仓 ingest 起就按增量约束 append,永远在。它说清全局由哪些仓拼成、哪些只地形扫描、哪些跨仓边待接合——这本身就是一份全局骨架,也是认识的入口。
> 2. **派生 query（实时图,只要有页就能跑）**：已挖范围内的依赖/影响,沿 `depends-on` + 反向双链现算。
> 3. **`system-architecture`（可选增益,成熟才有）**：跨仓看清后由 update 综合出的人工架构叙事+跨仓图;**若存在**就叠加上去。
>
> **关键:`system-architecture` 早期缺席不是缺陷——"跨仓图还画不出"正是 `coverage` 要记录的事实。** 所以入口永远是 `coverage`,不是那张人工图；完整性由 coverage 的盲区与待接合边显式表达，`system-architecture` 不承担完整性职责；有它可以补充全局叙事，没它也能通过 coverage+query 建立可追溯的全局认识。

### 增量阶段约束

`obsidian-kb-ingest` / `obsidian-kb-deep-analysis` 每次增量采用追加式写入：

- 写仓内页（其自然产物）。
- **新增 + 最小接线**视图层页（contracts/domains/use-cases）：新发现的页就创建；已有页只追加反向链接、使用者条目或证据，不重写既有叙事。
- **append `coverage.md`**：登记本仓 ingest 深度；扫到指向未 ingest 仓的调用、或只找到一端的契约，就记录为待接合边（必要时建 `status: partial` 单边契约页）。
- append `log.md`。

**不**在每次增量里维护任何地图,也**不碰** `system-architecture`。依赖/影响面读时由 query 现算；唯一的人工叙事页 `system-architecture` 由 `obsidian-kb-update` 在跨仓结构变化时直接刷新。

## 索引页纪律

- **不**默认生成 `indexes/`、`_map` 这类 thin 索引/地图页。
- 视图索引、依赖图、影响范围**靠 frontmatter 查询 + 双链遍历即时得出**，不物化。
- 持久知识住在可读页面里：`global/use-cases/`、`global/domains/`、`global/contracts/`、`repos/`、`global/architecture/system-architecture.md` 是知识的权威来源；`global/architecture/coverage.md` 是覆盖度与盲区的权威来源。
- `coverage.md` **不**是派生地图：它记的是 query 算不出来的东西——"还没 ingest 的仓"和"只找到一端的边"。已 ingest 范围内的依赖/影响仍由 query 现算，不进 coverage。
