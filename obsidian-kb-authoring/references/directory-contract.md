# 目录契约（Directory Contract）

知识库根目录 `{kb-root}`（默认 `{workspace-root}/code-kb`）的物理布局。

组织原则（详见 [view-model.md](view-model.md)）：

1. **双层按作用域切**：工作区层（跨仓 catalog）+ 仓库层（仓内细节）。
2. **工作区层：顶层目录 ≈ 视图 catalog**。
3. **仓库层：不复刻视图文件夹，保持扁平**；视图维度靠 frontmatter `view:` 承载。
4. **folder vs 单文件判据**：每实例是"独立大页"→ 文件夹；实例小而多 → 单文件分 section，大到撑不住再拆文件夹。
5. **视图不必平均分配目录**：按该视图"持久手写内容"多少加权。影响/运行视图**不物化成工作区页**——影响靠 query 即时遍历、运行活在仓内 flows/。

## 单一来源纪律

四类规则各有唯一权威来源，别处一律引用、不复述，防止多份定义漂移：

| 规则 | 唯一来源 | 怎么用 |
|---|---|---|
| **页面结构**（每页有哪些 section） | `obsidian-kb-authoring/templates/{type}.template.md` 真模板文件 | 新建页优先 `scaffold {type}` 吐骨架；lint 从模板反推必需 section；改结构改模板 |
| **frontmatter 字段/枚举/默认值** | [frontmatter-schema.md](frontmatter-schema.md) | 每次写 frontmatter 查它 |
| **目录路径/放哪/是否新建** | 本文件（directory-contract.md） | 决定文件落点查它 |
| **双链关系/影响传播边** | [link-contract.md](link-contract.md) | 每次建关系、做影响分析查它 |

> 其它 skill（ingest / deep-analysis / update / lint）**不得重新声明**结构、字段、路径或关系，只引用上述来源。

## 目录树

```text
code-kb/
  index.md                      # 入口:链向六视图各 catalog        (人工叙事)
  log.md                        # 知识库操作流水                    (只追加)

  # ── 工作区层:全部收进 global/(对应 frontmatter repo: global)──
  global/
    use-cases/                  # 用例视图(+1):跨仓场景目录 = agent 主入口
      {用例名}.md               #   (只新增,不改旧)
    domains/                    # 逻辑视图:业务域
      {业务域}.md               #   (只新增,不改旧)
    contracts/                  # 契约视图:跨边界契约
      {契约名}.md               #   (只新增,不改旧)
    architecture/               # 实现视图·工作区汇总
      system-architecture.md    #   工作区唯一人工叙事总览(增量不碰;跨仓结构变化由 update 刷新)
      coverage.md               #   覆盖度/前沿账本:已挖到哪、哪条跨仓边还没接上(只追加)
    # 运行视图活在 repos/{repo}/flows/ 深挖 + use-cases,靠 view:runtime 承载,无工作区目录。
    # 影响视图纯查询派生:query 沿 depends-on + 反向双链现算「改 X 炸什么」,不落页。
    extra/                      # 兜底:六视图都承载不了的外部知识(可选,update 模式 B 兜底专用)
      {标题}.md                 #   type:extra view:meta, init 不预建

  # ── 仓库层:每仓六视图细节,保持扁平(与 global/ 并列)──
  repos/{repo-name}/
    architecture.md             # 实现:本仓静态结构 + 仓库路由(链向 modules/flows/契约)
    glossary.md                 # 逻辑:术语→链接索引(不存第二份定义)
    api-surface.md              # 契约:本仓对外接口面
    data-models.md              # 数据:结构
    config-and-env.md           # 实现/运行:配置与环境
    key-implementations.md      # 实现:复杂算法/核心逻辑
    runtime-notes.md            # 运行:error-handling + gotchas 合并(薄时合并,有量才拆回)
    testing-strategy.md         # 视图正交的 dev-process facet,有内容才生成
    candidate-flow.md           # 运行:全量已识别流程清单(自动深挖进度)
    modules/{模块名}.md         # 实现:多实例 → 文件夹
    flows/                      # 运行/用例:每个深挖流程一个文件夹(无单文件浅流程页)
      {分析主题}/               #   obsidian-kb-deep-analysis 产物
        调用树.md
        主干流程.md
        {分支主题}.md
        跨边界数据流.md
        数据结构.md
        自查报告.md
```

### 页面取舍

- 工作区层全部住在 `global/` 下（`global/use-cases/`、`global/domains/`、`global/contracts/`、`global/architecture/`、`global/extra/`），对应 frontmatter `repo: global`；`index.md`/`log.md`/`repos/` 与 `global/` 并列。
- 跨仓关注点不单独成页：接口归 `global/contracts/`、风险归仓内 `runtime-notes`、依赖与爆炸半径由 query 从 `depends-on` + 反向双链现算（不落页）。
- `global/architecture/coverage.md` 是工作区唯一的**覆盖度/前沿账本**：诚实记录每仓挖到什么深度、哪些跨仓边只找到一端还没接上、有哪些已知盲区。它让"增量永远不完整"从负债变成可读的待补地图——agent 建立全局认识时必读，知道哪里能下结论、哪里是盲区。只追加，不做综合改写。
- 跨仓边只先找到一端时建**单边契约**（`global/contracts/{X}` 标 `status: partial`），并在 `coverage.md` 悬挂边表挂账；等另一端的仓 ingest 进来再接合，不编造假对端。
- `glossary` 是术语→链接索引，不存第二份定义。
- `runtime-notes` 在 error-handling 与 gotchas 内容都较薄时合一；任一方内容量大时各自独立成页。它同时兼任跨边界/已知地雷的人工风险笔记落点。
- `global/extra/` 是**最后手段**：仅当一条外部知识与现有库毫无关联、且补齐 `global/domains/`、`global/contracts/`、`global/use-cases/` 视图层页后仍无页能承载时，才建 `global/extra/{标题}.md`。能进六视图的知识不许塞 `extra/`；`init` 不预建该目录。
- 仓内不复刻视图文件夹；只有 `modules/`、`flows/` 这类多实例单元才成文件夹。

## 工作区页面的维护方式（决定增量刷新行为）

工作区聚合页不能都当手写页，否则每次增量补仓都要回头改一堆，迟早不一致。按维护方式分三种：

| 维护方式 | 哪些页 | 增量时怎么处理 |
|---|---|---|
| **只新增 + 最小接线**（发现新的加一页，已有页不重写叙事） | `global/contracts/{X}`、`global/domains/{X}`、`global/use-cases/{X}` | 发现新的就**新增一页**；已有页只允许追加证据支撑的反向链接、使用者列表或状态接合，不做综合改写 |
| **只追加**（前沿账本，记已知盲区） | `global/architecture/coverage.md` | **append 一行**：新挖的仓登记深度、新发现的悬挂边挂账；接上一端时把对应行翻成"已接合"，不综合改写 |
| **人工叙事**（需人工综合判断） | `global/architecture/system-architecture.md` | 增量时**不碰**；由 `obsidian-kb-update` 在跨仓结构变化时**直接重写刷新** |

依赖图 / 技术栈 / 数据流 / 影响面**不物化成页**：它们是 `depends-on` + 双链的派生物，由 query 即时遍历回答，永远 fresh，不进维护循环。

> **全局认识 = coverage 地基 + query 现算 +（可选）system-architecture，不是一个胖页**。agent 要全工程视角时按这个顺序读：
> 1. **`coverage.md`（地基,恒在）**：从第一个仓 ingest 起就被铁律强制 append,永远在。它说清全局由哪些仓拼成、哪些只地形扫描、哪些跨仓边悬着——这本身就是一份诚实的全局骨架,也是认识的入口与兜底。
> 2. **派生 query（实时图,只要有页就能跑）**：已挖范围内的依赖/影响,沿 `depends-on` + 反向双链现算。
> 3. **`system-architecture`（可选增益,成熟才有）**：跨仓看清后由 update 综合出的人工架构叙事+跨仓图;**若存在**就叠加上去。
>
> **关键:`system-architecture` 早期缺席不是缺陷——"跨仓图还画不出"正是 `coverage` 要记录的诚实。** 所以入口和兜底永远是 `coverage`,不是那张人工图;完整性由账本诚实兜底,`system-architecture` 不背"完整性"的锅,有它锦上添花、没它 coverage+query 两处足以建立诚实的全局认识。

### 增量阶段铁律

`obsidian-kb-ingest` / `obsidian-kb-deep-analysis` 每次增量**只做加法**：

- 写仓内页（其自然产物）。
- **新增 + 最小接线**视图层页（contracts/domains/use-cases）：新发现的页就创建；已有页只追加反向链接、使用者条目或证据，不重写既有叙事。
- **append `coverage.md`**：登记本仓 ingest 深度；扫到指向未 ingest 仓的调用、或只找到一端的契约，就挂账成悬挂边（必要时建 `status: partial` 单边契约页）。
- append `log.md`。

**不**在每次增量里维护任何地图,也**不碰** `system-architecture`。依赖/影响面读时由 query 现算；唯一的人工叙事页 `system-architecture` 由 `obsidian-kb-update` 在跨仓结构变化时直接刷新。

## 索引页纪律

- **不**默认生成 `indexes/`、`_map` 这类 thin 索引/地图页。
- 视图索引、依赖图、爆炸半径**靠 frontmatter 查询 + 双链遍历即时得出**，不物化。
- 持久知识住在可读页面里：`global/use-cases/`、`global/domains/`、`global/contracts/`、`repos/`、`global/architecture/system-architecture.md` 是知识的权威来源；`global/architecture/coverage.md` 是覆盖度与盲区的权威来源。
- `coverage.md` **不**是派生地图：它记的是 query 算不出来的东西——"还没 ingest 的仓"和"只找到一端的边"。已 ingest 范围内的依赖/影响仍由 query 现算，不进账本。
