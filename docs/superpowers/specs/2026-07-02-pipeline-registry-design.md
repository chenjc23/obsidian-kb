# 流程编排注册化：pipeline 注册表 + 薄执行器

> 目标读者：本仓维护者与多人协作团队。
> 状态：设计已与用户逐段确认，待评审后转实现计划。

## 1. 背景与痛点

知识工程套件已经把**页面结构**收敛进 `obsidian-kb-authoring/registry.yaml`（页型 → 模板 → 落点 → 视图 → lint 连接规则），`describe`/`scaffold`/`lint` 都从它派生。这一层是干净的单一来源。

但**流程编排（pipeline）还完全活在自然语言里**：

- `obsidian-kb-ingest/SKILL.md` = 8 个 Phase 的散文；`obsidian-kb-deep-analysis/SKILL.md` = 6 个 Phase 的散文。每个 Phase「产出什么页、依赖哪个前置 Phase、怎么追踪完成」全靠文字描述 agent 去遵守。

由此产生三个痛点：

1. **改一发动全身**：「页面 X 由 Phase N 生成」这条逻辑写死在 ingest 散文里。改流程 = 改散文，牵连四处。
2. **冗余**：`registry.yaml` 已给每个页型写了 `summary`，ingest 又用整段散文复述「生成 overview.md：记录本仓定位…」；authoring 的 references 已是约束单一来源，ingest 开头又复述一遍「增量约束」。事实被抄了两三遍。
3. **靠自然语言编排**：阶段先后（如「Phase 3 只做发现、深挖统一在 Phase 8」）靠散文里的口头约束维系，脆弱、不可校验、难扩展。

## 2. 参考：OpenSpec 的编排机制

[OpenSpec](https://github.com/Fission-AI/openspec) 把「阶段」变成声明式 `schema.yaml` 里的注册记录：

```yaml
name: spec-driven
artifacts:
  - id: proposal
    generates: proposal.md
    template: proposal.template.md
    requires: []
    instruction: <自然语言指导>
  - id: tasks
    requires: [specs, design]
apply:
  requires: [tasks]
  tracks: tasks.md          # 追踪完成度的 checkbox 清单
  instruction: ...
```

可借鉴的四个核心点，恰好对应本仓三个痛点：

1. **每个阶段 = 一条注册记录**：`id + generates(产物) + template + requires(依赖) + instruction`。
2. **`requires` 声明依赖，形成 DAG**——阶段先后由数据结构决定，不靠散文。
3. **模板/指令是引用**，不内联，事实只存一处。
4. **`tracks` 指向 checkbox 清单** 判定完成——本仓的 `candidate-flow.md`「已深挖」追踪表已是同一模式，独立发明了它。

**结论**：把 `registry.yaml` 从「页型注册表」扩成「页型 + 管线（pipeline）注册表」，ingest/deep-analysis 的 SKILL.md 就能从多段散文塌缩成薄执行器。三个痛点一起解。

## 3. 目标与非目标

### 3.1 目标

1. **流程编排有唯一来源**：阶段的产物/依赖/追踪/完成判定全部声明在 `registry.yaml` 的 `pipelines:`，改流程只改注册表一处。
2. **去冗余**：每个阶段的自然语言指导独立成小文件并引用 authoring references，事实只存一处；SKILL 不再复述 registry 的 summary/约束。
3. **提高 harness**：新增 `pipeline status/next` 命令族，脚本读 KB 现状算出下一个该跑的阶段并吐出其 instruction；依赖满足与完成判定交给代码，agent 只负责写内容。
4. **易扩展**：加/改/重排阶段 = 改注册表 + 加一个 instruction 文件，不碰执行器代码。

### 3.2 非目标（本轮不做）

- **不**改动 `registry.yaml` 现有 `schema:`/`types:`（只新增 `pipelines:` 顶层键）。
- **不**把 `update`（回改）/`lint`（校验）纳入 pipeline——它们不是线性 phase 化流程，保持现状。
- **不**改写知识库已有页面内容。
- **不**新增运行时第三方依赖（保持零依赖风格）。

## 4. 架构：三层

```text
┌─ 数据层 ── registry.yaml 新增 pipelines: 顶层键 ───────────────┐
│  每个 pipeline (ingest / deep-analysis) = 一串 stage 记录:      │
│    id / produces(产物落点) / requires(依赖,构成 DAG)          │
│    / instruction(文件引用) / tracks(可选追踪表) / done(完成判定)│
├─ 指导层 ── pipelines/{name}/{stage}.md 小文件 ─────────────────┤
│  每个 stage 的自然语言「怎么做」各一个小文件。                   │
│  只写这一步特有的动作;schema/目录/约束一律引用 authoring        │
│  references,不再复述(去冗余在这里发生)。                       │
├─ 执行层 ── pipeline 命令族 + 塌缩后的薄 SKILL ────────────────┤
│  obsidian-kb.mjs pipeline status --repo X → 读 KB 现状,        │
│      逐 stage 算 done/pending,打印 DAG 进度                     │
│  obsidian-kb.mjs pipeline next  --repo X → 返回下一个「依赖已满足 │
│      且未完成」的 stage + 它的 instruction 正文                  │
│  SKILL.md 塌成 ~30 行:循环 next → 按 instruction+authoring 写   │
│      → 再 next,直到 status 全绿                                 │
└────────────────────────────────────────────────────────────────┘
```

**指导层文件目录**：`obsidian-kb-authoring/pipelines/{pipeline}/{stage}.md`（与 `templates/` 并列，同属 authoring「契约之家」，团队可像维护模板一样维护流程指导）。

## 5. 数据层：`pipelines:` 注册表形态

在 `registry.yaml` 新增顶层键 `pipelines:`，与现有 `schema:`/`types:` 并列。每个 pipeline 是一串 stage：

```yaml
pipelines:
  ingest:
    description: 首次仓库分析,先建广度再补深度
    stages:
      - id: terrain
        produces: [repos/{repo}/overview.md, repos/{repo}/architecture.md]
        instruction: pipelines/ingest/terrain.md
        requires: []
        done:
          exists: produces          # 落点文件都在
          noPlaceholder: true       # 无 scaffold 留的 <!-- 填 --> 残留

      - id: submodules
        produces: [repos/{repo}/submodules/]
        instruction: pipelines/ingest/submodules.md
        requires: [terrain]
        done: { exists: produces, noPlaceholder: true }

      - id: candidate-flows
        produces: [repos/{repo}/candidate-flow.md]
        instruction: pipelines/ingest/candidate-flows.md
        requires: [submodules]
        done: { exists: produces }

      - id: supplements       # glossary/api-surface/data-models/... 有内容才生成
        instruction: pipelines/ingest/supplements.md
        requires: [terrain]
        done: { instructionSelfReport: true }   # 无强制产物,靠 instruction 内自查

      - id: domains-contracts
        instruction: pipelines/ingest/domains-contracts.md
        requires: [submodules, supplements]
        done: { instructionSelfReport: true }

      - id: backlinks
        instruction: pipelines/ingest/backlinks.md
        requires: [domains-contracts, candidate-flows]
        done: { instructionSelfReport: true }

      - id: coverage
        produces: [global/architecture/coverage.md]
        instruction: pipelines/ingest/coverage.md
        requires: [domains-contracts]
        done: { exists: produces }

      - id: deep-dive
        requires: [candidate-flows, coverage, backlinks]
        foreach: candidate-flow           # 对追踪表每一行
        runs: deep-analysis               # 展开成子 pipeline
        tracks: repos/{repo}/candidate-flow.md
        done:
          tracksAllComplete: "已深挖"      # 追踪表每行状态都是「已深挖」

  deep-analysis:
    description: 单个函数/流程的详尽追踪
    stages:
      - id: call-tree
        produces: [repos/{repo}/flows/{topic}/调用树.md]
        instruction: pipelines/deep-analysis/call-tree.md
        requires: []
        done: { exists: produces, noPlaceholder: true }
      # …主干流程 / 分支 / 跨边界数据流 / 数据结构 / 自查报告,各一条 stage
```

**约定：**
- `id` = stage 在本 pipeline 内唯一。
- `produces` = 落点 glob（占位 `{repo}`/`{topic}` 由执行时填入）；无强制产物的 stage 省略。
- `requires` = 同 pipeline 内前置 stage id 列表，构成 DAG。
- `instruction` = 指向 `pipelines/…/*.md` 的相对路径（authoring 根起）。
- `tracks` = 追踪表文件（可选）。
- `foreach` + `runs` = pipeline 嵌套：对追踪表每行展开运行子 pipeline。
- `done` = 声明式完成判定规则（见 §6）。

## 6. 完成判定（done 引擎）

`pipeline status` 对每个 stage 用**通用引擎**解释 `done` 规则，不给每个 stage 写死判定代码。规则谓词（可组合）：

| 谓词 | 含义 |
|---|---|
| `exists: produces` | `produces` 列出的落点文件都存在 |
| `noPlaceholder: true` | 相关文件里无 scaffold 留的 `<!-- 填 -->` 残留 |
| `tracksAllComplete: "已深挖"` | `tracks` 追踪表每行状态都为指定值 |
| `instructionSelfReport: true` | 无强制产物的 stage，完成与否由 agent 依 instruction 自查后回报（脚本记录一个 `.pipeline-state` 标记，见 §7） |
| `lintClean: true` | 该 stage 产物 lint 无 error（可选升档） |

**默认强度 = 中档**：`exists + noPlaceholder`。`noPlaceholder` 复用现成 scaffold 标记，能抓「骨架生成了但没填全」的半成品。

**可声明升级**：特定 stage 在 registry 里声明更硬的规则——深挖 stage 用 `tracksAllComplete`；契约相关 stage 可叠 `lintClean` 校验 partial↔coverage 一致。弱档（只 `exists`）不作默认，避免「页写了没填全也算过」。

## 7. 执行层：pipeline 命令族 + 薄 SKILL

### 7.1 新增 `lib/pipeline.mjs`

- `loadPipeline(name)` → 从 registry 读取 pipeline 定义（复用现有 `registry.mjs` 加载）。
- `pipelineStatus({ kbRoot, pipeline, repo, topic })` → 对每个 stage 求值 `done`，返回 `[{ id, state: done|ready|blocked }]`（`ready` = 依赖全 done 但自身未 done；`blocked` = 有依赖未 done）。
- `pipelineNext(...)` → 返回第一个 `ready` stage 的 `{ id, instruction 正文, produces }`；全 done 时返回完成信号。
- 嵌套：遇 `runs: deep-analysis` 的 stage，对 `foreach` 追踪表每行递归求子 pipeline 的 `done`，聚合成本 stage 的 `tracksAllComplete` 判定。
- `instructionSelfReport` 状态存 `{kb-root}/.obsidian-kb/pipeline-state.json`（gitignore），记录 agent 回报「本 stage 完成」的标记，避免无产物 stage 永远算不完成；`pipeline done <stage>` 子命令写入该标记。

### 7.2 CLI

```
obsidian-kb.mjs pipeline status --repo X [--pipeline ingest] [--topic T] [--json]
obsidian-kb.mjs pipeline next   --repo X [--pipeline ingest] [--topic T] [--json]
obsidian-kb.mjs pipeline done   <stage> --repo X [--pipeline ingest]
```

走新 `lib/pipeline.mjs`，不碰现有 `scaffold`/`lint`/`query`。`describe` 新增 `describe pipeline [name]` 子视图，复用现有 describe 架构。

### 7.3 SKILL 塌缩

`ingest/SKILL.md` 从 143 行 8 段散文 → 约 30 行薄执行器：

````markdown
# Obsidian KB Ingest
配合 obsidian-kb-authoring 写笔记。本 skill 不描述阶段细节——阶段由
registry.yaml 的 pipelines.ingest 定义,自然语言指导在 pipelines/ingest/*.md。

执行循环:
1. `pipeline status --repo X` 看进度
2. `pipeline next --repo X` 拿下一个 ready stage + 它的 instruction
3. 按 instruction 用 authoring/references 写页(优先 scaffold 拿骨架)
4. 无产物的自查型 stage 完成后 `pipeline done <stage> --repo X` 标记
5. 回到 1,直到 status 全绿
````

`deep-analysis/SKILL.md` 同理塌缩。Phase 8 那套「串行子 agent 编排」落到执行层 SKILL 的说明段，不进 registry。

**判断性内容不丢**：每个 stage 特有的禁忌（如深挖「禁止用 `...` 跳过节点」「禁止的捷径」）进对应 instruction 文件；跨阶段通用的「质量底线/源码证据诚实」留在 authoring 宪法（已是单一来源）。

## 8. 去冗余：三处确切去法

1. **ingest 开头「增量约束…」整段** → 删。写入范围由 stage 的 `produces` 声明；散文引用 `directory-contract.md`。
2. **每个 Phase 的「生成 overview.md：记录本仓定位、模块定义…」** → 落到该 stage 的 instruction 文件，只写**动作**；页型用途（summary）由 registry `types:` 已定义，不复述。
3. **deep-analysis 对 frontmatter/page-shapes 的引用** → 已经是引用，保持不动。

## 9. 兼容性

- `registry.yaml` 现有 `schema:`/`types:` **一字不动**，只新增 `pipelines:`。
- `lib/yaml.mjs` 解析器需支持 `pipelines:` 的嵌套形态：**stage 列表项为 map、map 内含嵌套 list（`requires`/`produces`）和嵌套 map（`done`）**。若现有解析器不支持「列表项 map 内再嵌 map」，在其封闭特性集内扩展并补单测（见 §11）。
- 现有 22 测试 + 全链路冒烟不破坏；新增测试只覆盖新模块。

## 10. stage 切分说明（ingest）

现有 8 Phase 按 DAG 重切，让依赖显式化：

| 现 Phase | 新 stage | requires |
|---|---|---|
| Phase 1 地形扫描 | `terrain` | — |
| Phase 2 子模块 | `submodules` | terrain |
| Phase 3 流程发现 | `candidate-flows` | submodules |
| Phase 4 补充页 | `supplements` | terrain |
| Phase 5 域/契约 | `domains-contracts` | submodules, supplements |
| Phase 6 双链 | `backlinks` | domains-contracts, candidate-flows |
| Phase 7 coverage | `coverage` | domains-contracts |
| Phase 8 深挖 | `deep-dive` (foreach→deep-analysis) | candidate-flows, coverage, backlinks |

Phase 3「只发现」与 Phase 8「才深挖」的口头边界，现由 `deep-dive.requires` 天然表达——deep-dive 排在最后是因为它依赖 candidate-flows/coverage/backlinks 全部就绪，不再靠散文提醒。

## 11. 测试

1. **现有测试全绿**（不改测试源）：证明 `types:`/scaffold/lint 行为不变。
2. **`yaml.test.mjs` 扩充** ✨：`pipelines:` 嵌套形态（列表项 map 内含嵌套 list 与嵌套 map）解析正确 + 不合规输入抛错。
3. **`pipeline.test.mjs`** ✨：
   - `pipelineStatus` 的 DAG 求值：done/ready/blocked 分类正确。
   - `done` 引擎每个谓词（exists / noPlaceholder / tracksAllComplete / instructionSelfReport）。
   - 嵌套：`deep-dive` 的 `tracksAllComplete` 由子 pipeline 完成度递归聚合。
   - `pipelineNext` 返回第一个 ready stage 且 instruction 正文非空。
4. **全链路冒烟** ✨：`init → scaffold → pipeline status → pipeline next → (写页) → pipeline status 全绿`。

运行：`node --test using-obsidian/scripts/lib/*.test.mjs using-obsidian/scripts/*.test.mjs`。

## 12. 风险与缓解

| 风险 | 缓解 |
|---|---|
| YAML 解析器新形态（嵌套 list/map in list item）有边界 bug | 封闭特性集内扩展 + 独立单测 + 不合规输入抛错 |
| 无产物 stage 的完成判定不可靠 | `instructionSelfReport` + `.obsidian-kb/pipeline-state.json` 显式标记，`pipeline done` 写入 |
| pipeline 嵌套递归求值复杂 | `runs`/`foreach` 仅支持一层（ingest→deep-analysis），不做任意深递归；单测覆盖 |
| SKILL 塌缩丢失判断性约束 | 禁忌进 instruction 文件、通用底线留 authoring 宪法；迁移逐条对照现 SKILL |
| 团队改 instruction 文件与 registry stage 漂移 | `pipeline status` 校验每个 stage 的 `instruction` 文件存在,缺失即报错 |

## 13. 实现阶段（建议顺序）

1. **P1 解析器扩展**：`lib/yaml.mjs` 支持 `pipelines:` 嵌套形态 + `yaml.test.mjs` 补例。
2. **P2 pipeline 引擎**：`lib/pipeline.mjs`（loadPipeline/status/next/done 引擎/嵌套）+ `pipeline.test.mjs`。
3. **P3 注册表迁移**：`registry.yaml` 加 `pipelines.ingest`/`pipelines.deep-analysis` + 逐 stage 建 `pipelines/*/*.md` instruction 文件（从现 SKILL Phase 誊入并去冗余）。
4. **P4 CLI + describe**：`pipeline status/next/done` 命令 + `describe pipeline`。
5. **P5 SKILL 塌缩**：ingest/deep-analysis SKILL.md 改薄执行器；清 authoring 侧被复述的约束。
6. **P6 收尾**：全链路冒烟；README/其它 SKILL 指向新单一来源。

每阶段以「现有测试全绿 + 本阶段新测试通过」为完成判据。
