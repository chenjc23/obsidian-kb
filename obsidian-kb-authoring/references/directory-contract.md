# 目录契约（Directory Contract）

知识库根目录 `{kb-root}`（默认 `{workspace-root}/code-kb`）的物理布局。

组织原则（详见 [view-model.md](view-model.md)）：

1. **双层按作用域切**：工作区层（跨仓 catalog）+ 仓库层（仓内细节）。
2. **工作区层：顶层目录 ≈ 视图 catalog**。
3. **仓库层：不复刻视图文件夹，保持扁平**；视图维度靠 frontmatter `view:` 承载。
4. **folder vs 单文件判据**：每实例是"独立大页"→ 文件夹；实例小而多 → 单文件分 section，大到撑不住再拆文件夹。
5. **视图不必平均分配目录**：按该视图"持久手写内容"多少加权。影响/运行视图**不物化成工作区页**——影响靠 query 即时遍历、运行活在仓内 flows/。

## 目录树

```text
code-kb/
  index.md                      # 入口:链向六视图各 catalog        (人工叙事)
  log.md                        # 知识库操作流水                    (只追加)

  # ── 工作区层:顶层目录 ≈ 视图 catalog ──
  use-cases/                    # 用例视图(+1):跨仓场景目录 = agent 主入口
    {用例名}.md                 #   (只新增,不改旧)
  domains/                      # 逻辑视图:业务域
    {业务域}.md                 #   (只新增,不改旧)
  contracts/                    # 契约视图:跨边界契约
    {契约名}.md                 #   (只新增,不改旧)
  architecture/                 # 实现视图·工作区汇总
    system-architecture.md      #   工作区唯一人工叙事总览(改动只标 stale)
  # 运行视图活在 repos/{repo}/flows/ 深挖 + use-cases,靠 view:runtime 承载,无工作区目录。
  # 影响视图纯查询派生:query 沿 depends-on + 反向双链现算「改 X 炸什么」,不落页。
  extra/                        # 兜底:六视图都承载不了的外部知识(可选,update 模式 B 兜底专用)
    {标题}.md                   #   type:extra view:meta, init 不预建

  # ── 仓库层:每仓六视图细节,保持扁平 ──
  repos/{repo-name}/
    architecture.md             # 实现:本仓静态结构 + 仓库路由(链向 modules/flows/契约)
    glossary.md                 # 逻辑:术语→链接索引(不存第二份定义)
    api-surface.md              # 契约:本仓对外接口面
    data-models.md              # 数据:结构
    config-and-env.md           # 实现/运行:配置与环境
    key-implementations.md      # 实现:复杂算法/核心逻辑
    runtime-notes.md            # 运行:error-handling + gotchas 合并(薄时合并,有量才拆回)
    testing-strategy.md         # 视图正交的 dev-process facet,有内容才生成
    candidate-flow.md           # 运行:次关键流程候选清单(待确认深挖)
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

- 跨仓关注点不单独成页：接口归 `contracts/`、风险归仓内 `runtime-notes`、依赖与爆炸半径由 query 从 `depends-on` + 反向双链现算（不落页）。
- `glossary` 是术语→链接索引，不存第二份定义。
- `runtime-notes` 在 error-handling 与 gotchas 内容都较薄时合一；任一方内容量大时各自独立成页。它同时兼任跨边界/已知地雷的人工风险笔记落点。
- `extra/` 是**最后手段**：仅当一条外部知识与现有库毫无关联、且补齐 `domains/`/`contracts/`/`use-cases/` 视图层页后仍无页能承载时，才建 `extra/{标题}.md`。能进六视图的知识不许塞 `extra/`；`init` 不预建该目录。
- 仓内不复刻视图文件夹；只有 `modules/`、`flows/` 这类多实例单元才成文件夹。

## 工作区页面的两种维护方式（决定增量刷新行为）

工作区聚合页不能都当手写页，否则每次增量补仓都要回头改一堆，迟早不一致。按维护方式分两种：

| 维护方式 | 哪些页 | 增量时怎么处理 |
|---|---|---|
| **只新增**（发现新的加一页，不改旧） | `contracts/{X}`、`domains/{X}`、`use-cases/{X}` | 发现新的就**新增一页**，从不回改已有页 |
| **人工叙事**（需人工综合判断） | `system-architecture` | 增量时**只打 `status: stale`、不重写**；由 `obsidian-kb-update` 批量刷新 |

依赖图 / 技术栈 / 数据流 / 影响面**不物化成页**：它们是 `depends-on` + 双链的派生物，由 query 即时遍历回答，永远 fresh，不进维护循环。

### 增量阶段铁律

`obsidian-kb-ingest` / `obsidian-kb-deep-analysis` 每次增量**只做加法 + 打 stale**：

- 写仓内页（其自然产物）。
- **新增**只新增页（contracts/domains/use-cases），从不回改已有页。
- 给受影响的人工叙事页打 `status: stale`（一个标记，不是重写）。
- append `log.md`。

**不**在每次增量里维护任何地图。依赖/影响面读时由 query 现算；唯一的人工叙事页 `system-architecture` 批量刷新——那是 `obsidian-kb-update` 的活。

## 索引页纪律

- **不**默认生成 `indexes/`、`_map` 这类 thin 索引/地图页。
- 视图索引、依赖图、爆炸半径**靠 frontmatter 查询 + 双链遍历即时得出**，不物化。
- 持久知识住在可读页面里：`use-cases/`、`domains/`、`contracts/`、`repos/`、`architecture/system-architecture.md` 是知识的权威来源。
