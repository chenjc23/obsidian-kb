---
name: obsidian-kb-ingest
description: Use to create or refresh the first-pass Obsidian code knowledge base for one or more source repositories. Triggers on requests like "ingest this repo", "analyze this codebase into wiki notes", "build code-kb", "generate overview/architecture/modules/flows", or "把仓库生成知识库".
---

# Obsidian KB Ingest

首次仓库分析。目标：先建有用的广度，再补聚焦的深度。

**始终配合 `obsidian-kb-authoring` 写笔记。** 目录、frontmatter、页面形状、链接契约全部以 authoring 的 `references/` 为准，本 skill **不重复声明**，只负责产出流程。

增量铁律（authoring `references/directory-contract.md`）：ingest 每次**只做加法 + 打 stale**——写仓内页、新增只新增页（domains/contracts/use-cases）、给受影响的工作区人工叙事页打 `status: stale`、append `log.md`；**不**全量重建工作区地图。

## 输入识别

- 源仓库根目录。
- 每个源仓库的名称。
- 用户要广度首扫还是特定子集。

## `{kb-root}` 解析

不要询问用户知识库放哪。确定性解析：

1. 用户显式指定路径 → 用之。
2. 否则当前工作目录已有知识库目录 → 用检测到的。
3. 否则 → `{当前工作目录}/code-kb`。

知识库目录 = 名为 `code-kb/` 或包含 `index.md`/`repos/`/`log.md` 等若干结构的目录。仅当源仓库根或摄入范围无法推断时才询问，**永不**问 `{kb-root}` 放哪。

## Phase 1：仓库地形扫描 → `repos/{repo}/architecture.md`

1. 信号驱动的快速地形扫描：先读顶层目录 + manifest/构建文件 + 入口文件，再**沿 manifest/build 指向的源码根继续深入**（可能在更深层级），**跳过** `vendor`/`node_modules`/`build`/`dist`/`generated`/`third_party`/`.git` 等目录。目标是建立仓库形状、技术栈、分层、入口区域的认知——不遍历整棵树，也不固定深度。
2. 读元数据/构建文件（如有，C++ 优先）：`CMakeLists.txt`、`Makefile`、`conanfile.txt`/`conanfile.py`、`vcpkg.json`、Bazel `BUILD`、`README`、`package.json`、`go.mod`、`Cargo.toml`、`pyproject.toml`、`pom.xml`、`build.gradle`、`Dockerfile`、部署清单。
3. 识别并读入口文件：`main.cpp`、`src/main.cpp`、`app/main.cpp`、`main.go`、`index.ts`、`app.py`、`cmd/*`、`src/main.*`、框架引导模块。
4. 分析源码目录分层（C++ 常见 `include/` 与 `src/` 分离、`lib/`、`modules/`），读依赖注入/初始化/装配代码：`main()`、`wire.go`、`container.ts`、`AppModule`、服务注册、路由装配、工厂/单例初始化。
5. 从代码识别真实设计模式，不猜。
6. 生成 `repos/{repo}/architecture.md`：它同时承担**本仓静态结构（实现视图）+ 仓库路由**（链向 modules / flows / 关键 contracts / data-models），并**包含一张 mermaid 架构图**（`graph`/`flowchart TD`，呈现分层与核心模块依赖）。

## Phase 2：模块拆解 → `repos/{repo}/modules/{模块名}.md`

1. 扫核心模块目录，读 index/barrel/export 与公共接口。
2. 分析模块间 import 依赖。
3. 每个真实职责边界一页（实现视图，多实例 → 文件夹）。不要给每个小文件夹都建页。
4. 在 frontmatter `depends-on` + 正文双链记录模块依赖（影响视图的边）。

## Phase 3：流程发现与分级（不生成浅流程页）

1. 从 API 路由、CLI 命令、event handler、job、consumer、协议分发器、消息 handler、状态机迁移、socket/帧解析、公共服务方法等入口开始。
2. 主动发现所有能从代码证据论证的业务关键流程，包括地形扫描期间发现的。
3. 搜索入口与接口证据（不限层级）：
   - HTTP 路由、controller、OpenAPI、RPC/gRPC server、proto/IDL、服务注册。
   - MQ topic、event 名、producer/consumer/subscriber/handler。
   - TLV 定义、message ID、command ID、operation code、encode/decode、dispatch map、handler registry。
   - socket 读写循环、frame parser、packet router、session handler。
   - CLI 命令、定时任务、worker、task executor。
   - 公共服务方法、orchestration、状态机入口、workflow 协调器。
4. 按业务价值、外部接口暴露、跨模块/跨仓耦合、协议复杂度、错误/重试/回滚风险、命名证据**排序并分级**：
   - **关键流程**：进入 Phase 8a 直接深度分析。
   - **次关键流程**：写入 `repos/{repo}/candidate-flow.md` 候选清单，等用户在 Phase 8b 确认。
5. **不生成单文件浅流程页。** 一个 flow 只有两种归宿：已深挖（`flows/{分析主题}/` 文件夹）或候选（`candidate-flow.md` 行）。

## Phase 4：补充页（有内容才生成）

- `glossary.md`：**术语→链接索引**，指向 domain/flow/data-model 的真定义，不存第二份定义。
- `api-surface.md`：路由、proto、OpenAPI、controller、消息契约（契约视图·本仓接口面）。
- `data-models.md`：ORM 模型、schema、proto/types、状态结构。大了再拆 `data-models/{结构}.md`。
- `config-and-env.md`：配置加载、env、feature flag。
- `runtime-notes.md`：**error-handling + gotchas 合并**——异常/错误码/重试/降级/告警 + 非显式约束/隐藏约定/已知陷阱。任一方内容量大时拆回独立页。
- `key-implementations.md`：复杂算法或重要核心逻辑。
- `testing-strategy.md`：测试目录、脚本、CI、fixture（视图正交，可选）。

## Phase 5：业务域与契约提取（修复孤儿视图，只新增页）

1. **逻辑视图** → `domains/{业务域}.md`：从 glossary、模块职责、README 领域语言聚类出业务域，定义概念、不变量、状态、相邻域，链向实现该域的流程。
2. **契约视图** → `contracts/{契约名}.md`：把首扫发现的跨边界契约（HTTP/RPC API、MQ topic、event、协议消息、TLV/frame）提升为独立契约页，记录消息标识、payload schema、producer/consumer、接收方发现证据。
3. 这两类是**只新增页**：发现新的加一页，不回改已有页。深度的端到端字段映射留给 deep-analysis。

## Phase 6：双向链接（见 authoring `references/link-contract.md`）

1. 模块↔模块依赖：A 依赖 B 则 A 链 `[[modules/B]]`，B 在"被依赖（入）"反向链。
2. 流程↔模块、流程↔契约、流程↔数据、域↔流程：全部双向。
3. `architecture.md`（仓库路由）列出核心流程与模块链接。
4. 检查每个新页至少一条入链。

## Phase 7：工作区更新（按维护方式区分处理）

按 authoring `references/directory-contract.md` 的三种维护方式处理，**不要手写自动生成页**：

- `index.md`：入口，链向六视图 catalog。
- `domains/_map.md`、`contracts/_map.md`：**自动生成**，由工具生成，勿手维护详情。
- `architecture/system-architecture.md`：**人工叙事**，增量时受影响则打 `stale`，不重写。
- `architecture/dependency-graph.md`、`runtime/data-flow.md`、`architecture/tech-stack.md`：**自动生成**，从 frontmatter + 双链投影，不手写。
- `impact/risk-map.md`、`architecture/shared-patterns.md`：**人工叙事**，跨仓真有内容才建/才打 stale。
- `log.md`：append 本次操作。

跨仓关注点不单独成页：接口归 `contracts/`、风险归 `impact/risk-map`、依赖归 `dependency-graph`。**不生成** `indexes/` thin 索引页。

## Phase 8：深度分析执行 + 用例种子

流程已在 Phase 3 分级，两级走法不同：**关键流程自动深挖、不确认（8a）；次关键流程才列候选给用户确认（8b）**。深度分析一律**串行**（见下方硬要求）。

### 8a：关键流程——自动逐个深挖（禁止确认，禁止暂停）

关键流程是 ingest 流程的**自动续作**，不需要任何用户确认。播报一次清单后**立刻开工**：

1. 先一次性把 Phase 3 标为**关键**的流程清单亮出来（流程名 + 入口/接口 + 推荐原因），这只是**播报**，告知"将立即逐个深挖"，不是征求同意。
2. 播报完**马上**按下方串行模型逐个调用 `obsidian-kb-deep-analysis`，把每一个关键流程都深挖完：
   - ❌ 不要问"要不要开始深度分析 / 要分析哪几个"。
   - ❌ 不要在亮完清单后停下来等用户回复——这正是要消除的错误行为。
   - ✅ 亮清单即开工。用户若想干预可随时打断，但默认**不等待、不确认**。
3. **所有关键流程全部深挖完成后**，才进入 8b。

### 8b：次关键流程进候选清单 → 确认 → 深挖

**前置：8a 的关键流程必须已全部深挖完。** 然后才把次关键候选交给用户确认：

1. 把 Phase 3 标为**次关键**的流程写入 `repos/{repo}/candidate-flow.md`（候选清单页）：

```markdown
## Deep Analysis 候选流程清单

| 序号 | 流程名称 | 入口/接口 | 触发方式 | 涉及仓库/模块 | 是否跨消息边界 | 风险等级 | 推荐原因 | 状态 |
|---|---|---|---|---|---|---|---|---|
| 1 | {流程名称} | `{文件路径}:{函数或接口}` | HTTP/RPC/MQ/TLV/job/CLI | {repo/module} | 是/否 | high/medium/low | {代码证据和业务原因} | 候选 |
```

2. 询问用户对哪些候选行运行深度分析；确认后按串行模型逐个深挖，并把对应行 `状态` 更新为 `已深挖`。

### 用例种子

**跨仓/多 flow 的端到端场景**深挖后种子化为 `use-cases/{用例名}.md`（用例视图，编排 + 链接为主）；单 flow 场景不开用例页，只给该深流程打 `view: usecase`。

### 串行执行模型（硬要求，8a 与 8b 通用）

优先子 agent 编排：主 agent 为每个流程创建一个专职子 agent，每个子 agent 只做一个 `obsidian-kb-deep-analysis` 任务。

1. 为第一个流程创建**唯一**一个子 agent。
2. 只给它一个流程、入口/接口证据、相关仓库、`{kb-root}`，及"用 `obsidian-kb-deep-analysis` + `obsidian-kb-authoring`"的指令。
3. 等它完成、写完笔记、返回摘要。
4. 检查失败写入、缺失证据、低置信缺口。
5. 然后才创建下一个流程的子 agent。

不得在当前子 agent 完成前为后续流程创建子 agent。不得批量创建。不得并行。深度分析更新共享知识页，并行会产生冲突编辑。

子 agent 不可用时，主 agent 串行执行同样流程（一个做完再下一个）。

## 质量底线

- 代码与 README 冲突时以代码为准。
- 业务流程发现不止步于地形扫描。
- 不忽略消息/协议/事件/topic 边界；指示下游处理时记入 `candidate-flow.md`。
- 入口或依赖不清时标 `confidence: low`。
- 首扫幂等：对未变源码重跑应产生等价笔记。
- 保留人工编辑：合并而非覆盖。
