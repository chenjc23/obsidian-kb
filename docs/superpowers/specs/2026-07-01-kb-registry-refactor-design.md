# 知识工程重构：中央注册表 + 聚焦模板（方案 A′）

> 目标读者：本仓维护者与即将加入的多人协作团队。
> 状态：设计已确认，待评审后转实现计划。

## 1. 背景与痛点

知识工程项目即将转为**多人协作开发**。专家已重新定义了知识库目录结构与需要哪些 md 文档，接下来要把**文档模板分发给每个人去研究定义**（模板也涉及该页型专有的元数据字段）。

当前工程的结构性障碍：**一个页型的定义摊在约 10 处，跨代码与 prose，靠手工保持同步**。改一个页型、加一个页面、动一个落点或元数据字段，都会牵连多处修改，不利扩展与维护，更不利多人并行（共享文件必然冲突与漂移）。

代码自身已坦承这种耦合：

- `using-obsidian/scripts/lib/lint.mjs:8` —— *"本文件是它（schema）在代码里的投影，改 schema 时两边一起改。"*
- `using-obsidian/scripts/lib/template.mjs:52` —— *"镜像 directory-contract.md 的落点路径——改目录契约必须同步这里。"*

### 1.1 现状：一个页型的定义散落在哪

| 位置 | 每页型硬编码了什么 |
|---|---|
| `template.mjs` | `TYPE_FILE`（type→模板文件名）、`targetPath()`（type→落点 switch）、`FLOW_FILES`（flow 六件套） |
| `lint.mjs` | `VALID_TYPES`、`REQUIRED_PROPERTIES`、per-type 连接规则（flow 需 domain+contract/module 链；contract 需 repo 链） |
| `index-build.mjs` | frontmatter 字段白名单 |
| `init.mjs` | 预建目录列表 |
| `references/frontmatter-schema.md` | type 枚举 + 各型关系字段 |
| `references/page-shapes.md` | type→用途→模板→必需 section 表 |
| `references/directory-contract.md` | 目录树 / 落点路径 |
| `references/view-model.md` | type→视图透镜映射 |

唯一已是单一来源的是模板 `.md` 正文本身（lint 已从其反推必需 section）。其余全是双写。

## 2. 目标与非目标

### 2.1 目标

1. **一个页型的结构事实有唯一来源**：改落点/视图/lint/枚举 → 定点改一处。
2. **模板聚焦**：团队成员只碰自己那一个模板文件，互不干扰、天然并行。
3. **代码数据驱动**：脚本不再硬编码任何页型清单，一律从注册表派生。
4. **参考文档自动对齐**：四份 reference 文档的机器事实从注册表生成，根除"两边一起改"。
5. **行为零回退**：现有测试全绿，对外 API 与命令签名不变。

### 2.2 非目标（本轮不做）

- **不**落地专家新定义的具体目录结构与新页型内容——本轮只交付**机制 + 迁现有页型**，新结构由团队后续各自补模板。
- **不**改写知识库已有页面内容。
- **不**新增运行时第三方依赖（保持本仓零依赖风格）。

## 3. 职责划分（多人协作模型）

| 角色 | 拥有的文件 | 装什么 | 协作特性 |
|---|---|---|---|
| **维护者** | `obsidian-kb-authoring/registry.yaml`（唯一） | 目录结构 + 每页型 `落点/视图/lint/对应模板` + 通用 schema（Tier1 必填、`confidence`/`status` 枚举） | 单人独占，无队内冲突 |
| **团队成员** | 各自的 `templates/{type}.template.md` | 起始 frontmatter（Tier1 + 该型专有字段，带 `<!-- 填 -->`）+ `## section` 骨架 + 写作提示 | 各改各的，零碰撞 |

**关键边界**：页型专有的 frontmatter 字段（如 contract 的 `producer`/`consumer`/`version`）**留在模板里**——"定义一页"本就包含"它带哪些字段"。注册表只管通用 schema 与结构 wiring。

## 4. 架构

```text
        ┌─────────────────────────────────────────────┐
        │   registry.yaml   (维护者 · 结构唯一来源)       │
        │   types: 每型 template/target/view/linkage     │
        │   schema: Tier1必填 · confidence/status 枚举    │
        └───────────────┬─────────────────────────────┘
                        │  loadRegistry() 经 lib/yaml.mjs 解析
     ┌──────────────────┼───────────────────┬──────────────────┐
     ▼                  ▼                    ▼                  ▼
  template/scaffold   lint              index-build       generate-docs
  (落点·骨架·必需section) (校验·枚举·连接)  (通用解析)        (生成参考文档)
                                                              │ 写入 GENERATED 区段
                              page-shapes / view-model表 / 目录树叶子 / type枚举
        ┌─────────────────────────────────────────────┐
        │   templates/*.template.md  (团队 · 聚焦)        │
        │   起始 frontmatter + ## section + 写作提示      │
        └─────────────────────────────────────────────┘
```

**两个单一来源，互不重叠**：

- **按页型** → 模板文件（团队持有：section 结构 + 专有字段 + 写法）。
- **跨页型** → `registry.yaml`（维护者持有：结构 wiring + 通用 schema）。

通用事实不归任何单个页型所有，给它独立单一家不违反"一型一处"。

## 5. 注册表

### 5.1 位置与格式

- **位置**：`obsidian-kb-authoring/registry.yaml`（authoring skill 是"契约之家"；脚本跨目录读，沿用 `template.mjs` 现有的相对路径手法 `path.resolve(HERE, '../../../obsidian-kb-authoring/...')`）。
- **格式**：YAML，规格书观感、非代码、对维护者友好。
- **解析**：现有 `frontmatter.mjs` 的 `parseSimpleYaml` 只支持**扁平** key/list，解析不了嵌套，且它服务页面 frontmatter 解析，**不可改动**。因此**新增一个仅服务注册表的小型嵌套 YAML 解析器** `using-obsidian/scripts/lib/yaml.mjs`，作用域严格限定在注册表所需形态。

### 5.2 `lib/yaml.mjs` 支持的最小特性集（封闭清单）

仅实现注册表需要的：

1. 2 空格缩进的嵌套 map；
2. 标量：字符串、`null`、`~`（→ null）；
3. 块列表 `- item`（标量项）；
4. 列表项为 map（`- key: v` 起头，后续同缩进续行）；
5. 内联流式列表 `[a, b, c]`；
6. `#` 行注释与全行注释；
7. 引号剥离（复用 `stripQuotes`）。

**不实现**：锚点/别名、多文档、多行标量块（`|`/`>`）、复杂键。解析器附独立单测覆盖每条特性 + 故意不合规输入应抛错。

### 5.3 形态（YAML 示例）

```yaml
schema:
  requiredFrontmatter: [title, type, repo, created, updated, confidence, status, sources]
  confidence: [high, medium, low]
  status: [active, partial, draft, deprecated]
  initDirs: [global/use-cases, global/domains, global/contracts, global/architecture, repos]

types:
  contract:
    template: contract                       # → templates/contract.template.md
    target: global/contracts/{title}.md      # 取代 targetPath() 的 contract 分支
    view: contract                           # 取代 view-model 映射
    summary: 跨边界契约，定义一次被多 flow 引用  # → page-shapes 用途列
    linkage:
      - linkPrefixAny: [repos/]
        message: Contract page should link producer or consumer repo/module pages

  module:
    template: module
    target: repos/{repo}/modules/{title}.md
    view: development
    summary: 单模块职责 + 依赖

  flow:
    template: null                           # 复合型：六件套各有自己的模板
    family: flow
    target: repos/{repo}/flows/{topic}/{member}.md
    view: runtime
    summary: deep-analysis 深流程产物，一文件夹六件
    members: [调用树, 主干流程, 分支主题, 跨边界数据流, 数据结构, 自查报告]

  index:
    template: null                           # 有效但无模板（meta 型）
    target: null
    view: meta
  # …其余页型一律照此誊入（见 §7 迁移清单）
```

约定：

- **type 名 = map 的 key**，不再单列。
- `{title}`/`{repo}`/`{topic}`/`{member}` 为落点占位，由 scaffold 填入。
- `flow` 用 `family`+`members` 表达"一型六文件"，取代 `FLOW_FILES`。
- 无模板的 meta 型（`index`/`log`/`risk`）显式 `template: null`：lint 认其为合法 type，scaffold 不为其找模板。
- **必需 `## section` 不进注册表**——仍由 lint 扫模板正文反推（保持今天的行为）。
- **`schema.initDirs` 是 init 预建目录的显式单一来源**（从 `init.mjs` 原样搬来，非从 target 派生）：`global/extra` 与各仓内子目录**有意不在其中**——延续 directory-contract"init 不预建 extra、仓内目录按需创建"的约定。改预建目录只动这一处。

### 5.4 `registry.mjs`

`using-obsidian/scripts/lib/registry.mjs`：读 `registry.yaml`、经 `lib/yaml.mjs` 解析、做完整性校验后导出。

- `loadRegistry()` → `{ schema, types }`。
- 校验（启动即失败，定位清晰）：每型 `view` 非空且属合法透镜集；`target`/`template` 同时为 null 或同时有效；`template` 指向的模板文件存在；`family` 型 `members` 对应的模板存在。
- 便捷派生：`listTypes()`、`typesByView(view)`、`requiredFrontmatter()`、`targetPattern(type)`。

## 6. 代码改动（逐模块，行为不变）

| 模块 | 改动 | 对外签名 |
|---|---|---|
| **`lib/yaml.mjs`** ✨新增 | §5.2 的最小嵌套 YAML 解析器 | 新增 `parseYaml(text)` |
| **`lib/registry.mjs`** ✨新增 | §5.4 | 新增 `loadRegistry`、`listTypes` 等 |
| **`lib/template.mjs`** | 删 `TYPE_FILE`/`FLOW_FILES`/`targetPath()` switch；`loadTemplate`/`targetPath`/`requiredSections` 改读 registry | **不变**（`fillMechanical`/`requiredSections`/`targetPath`/`loadTemplate`/`FLOW_FILES`/`TYPE_FILE` 仍导出：后两者改为从 registry 派生的等价值） |
| **`lib/lint.mjs`** | 删常量 `VALID_TYPES`/`REQUIRED_PROPERTIES` 与硬编码 per-type linkage；改读 `schema` + `types[type].linkage`（linkage 数据化为 `{prefixAny, message}` 规则） | `REQUIRED_PROPERTIES`/`VALID_TYPES`/`VALID_CONFIDENCE`/`VALID_STATUS` **仍导出**，改为从 registry 计算 |
| **`lib/index-build.mjs`** | frontmatter 字段白名单 → **通用解析全部 key**（`page.data` 全量保留 + 现有命名访问器照旧），新关系字段零代码流通 | `buildIndex`/`collectMarkdownFiles` 不变 |
| **`lib/init.mjs`** | 写死目录列表 → 读 `schema.initDirs`（§5.3，单一来源；不从 target 派生以免误建 `global/extra`）；仍保 `index.md`/`log.md` 种子 | `initKnowledgeBase`/`SEED_FILES` 不变 |
| **`lib/scaffold.mjs`** | 已走 `template.mjs`，基本不动；`listTypes()` 改为 `Object.keys(registry.types)`（含 `flow`） | 不变 |
| **`lib/cli.mjs` / `obsidian-kb.mjs`** | 新增 `generate-docs [--check]` 命令与导出 | 新增命令，旧命令不变 |

### 6.1 linkage 规则的数据化

今天 lint 里的硬编码（注意匹配语义不一）：

- flow：缺 `domain` → warning（frontmatter 判定）；正文链接里**没有任何**以 `global/contracts/` 开头**或** `includes('/modules/')` 的 → warning。
- contract：正文链接里**没有任何**以 `repos/` 开头的 → warning。

迁为注册表数据，lint 通用执行。规则的匹配子分两类谓词，逐字对应现有语义——`linkPrefixAny`=`startsWith`、`linkContainsAny`=`includes`、`requireFrontmatter`=字段非空；一条规则的任一匹配子命中即视为通过：

```yaml
# flow.linkage
- requireFrontmatter: domain
  message: Flow page is missing domain metadata
- linkPrefixAny: [global/contracts/]      # startsWith
  linkContainsAny: ['/modules/']          # includes（与 startsWith 取并，任一命中即通过）
  message: Flow page should link related contracts or modules
```

lint 改为遍历 `types[type].linkage`，对每条规则求值（`linkPrefixAny`/`linkContainsAny`/`requireFrontmatter` 任一满足即通过），**告警文案逐字保留**，使现有断言（如 `obsidian-kb.test.mjs` 的 `Invalid type` / 模板 section）不变。`linkPrefixAny` 与 `linkContainsAny` 同时出现时取并集——精确复刻 flow 现有的 `startsWith(...) || includes(...)`。

## 7. 迁移

把现存全部页型的 wiring 从代码/prose 一次性誊入 `registry.yaml`，逐型对照：

- 落点 ← `template.mjs` `targetPath()` 各分支。
- 模板文件 ← `TYPE_FILE` 映射（含 `candidate→candidate-flow`、`data-model→data-models`、`implementation→key-implementations`、`system-architecture→architecture` 这些别名）。
- 视图 ← `view-model.md` type→透镜表。
- 用途 ← `page-shapes.md` 用途列。
- linkage ← `lint.mjs` 现有 per-type 规则。
- flow 六件套 ← `FLOW_FILES`。
- meta/无模板型（`index`/`log`/`risk`/别名）按 §5.3 处置。

完成后跑 `generate-docs` 让四份 reference 文档对齐。**纯机械搬运，无行为变更**，由现有测试 + §8 黄金对照守住。

### 7.1 别名 type 的处置

`TYPE_FILE` 含同义别名（`candidate`/`candidate-flow`、`data-model`/`data-models` 等）。注册表保留这些 key 各自成条目并指向同一模板，确保 `loadTemplate('data-model')` 与 `loadTemplate('data-models')` 行为与今天一致。

## 8. 参考文档生成

`generate-docs` 在四份文档的 `<!-- GENERATED:start -->` / `<!-- GENERATED:end -->` 标记之间重写机器事实，手写叙事原样保留：

| 文档 | 生成区段 |
|---|---|
| `page-shapes.md` | type→用途→模板→必需 section（必需 section 由 registry+模板正文派生） |
| `view-model.md` | type→视图透镜表 |
| `directory-contract.md` | 目录树的落点叶子 |
| `frontmatter-schema.md` | `type` 枚举值 |

`generate-docs --check`：重新生成并与现状比对，有差异即非零退出，供 pre-commit / CI 守门，把"忘了同步"从悄悄漂移变成响亮失败。**首次迁移时**先用无 `--check` 模式写入 GENERATED 标记与内容。

## 9. 测试

1. **现有测试全绿**（不修改测试源）：`template.test.mjs`、`scaffold.test.mjs`、`obsidian-kb.test.mjs` 验证对外签名与行为不变。
2. **`yaml.test.mjs`** ✨：§5.2 每条特性 + 故意不合规输入抛错。
3. **`registry.test.mjs`** ✨：`loadRegistry` 校验路径（缺 view / 模板不存在 / member 缺失应抛错）；`listTypes()` 集合 = 旧 `VALID_TYPES` ∪ `{flow}`；每型 `targetPath` 与旧 switch 逐一等值（黄金对照）。
4. **`generate-docs --check`** ✨：迁移落定后对四份文档运行应零差异（幂等）。

运行方式：`node --test using-obsidian/scripts/lib/*.test.mjs using-obsidian/scripts/*.test.mjs`。

## 10. 风险与缓解

| 风险 | 缓解 |
|---|---|
| 自写 YAML 解析器有边界 bug | 作用域封闭（§5.2）+ 独立单测 + 不合规输入抛错；仅服务注册表，不碰页面 frontmatter |
| 迁移誊错落点/视图 | `registry.test` 对每型 `targetPath` 做黄金对照；现有 lint/scaffold 测试兜底 |
| 生成的文档与手写叙事冲突 | 严格用 GENERATED 标记隔离，只重写标记内区段 |
| 贡献者忘跑 `generate-docs` | `--check` 接入 pre-commit/CI，漂移即失败 |
| 跨目录读 `registry.yaml` 路径解析 | 沿用 `template.mjs` 已验证的相对路径手法，附 `loadRegistry` 解析失败的清晰报错 |

## 11. 实现阶段（建议顺序）

1. **P1 解析器**：`lib/yaml.mjs` + `yaml.test.mjs`（独立、可先行）。
2. **P2 注册表**：`registry.yaml`（誊入全部页型）+ `lib/registry.mjs` + `registry.test.mjs`（黄金对照旧 switch/映射）。
3. **P3 代码改写**：`template.mjs`/`lint.mjs`/`index-build.mjs`/`init.mjs`/`scaffold.mjs` 改读注册表；现有测试全绿。
4. **P4 文档生成**：`generate-docs [--check]` + 四份文档插 GENERATED 标记 + 首次生成；接入校验。
5. **P5 收尾**：更新各 SKILL.md/README 指向新的单一来源；`--check` 进 CI/pre-commit。

每阶段以"现有测试全绿 + 本阶段新测试通过"为完成判据。
