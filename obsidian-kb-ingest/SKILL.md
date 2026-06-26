---
name: obsidian-kb-ingest
description: Use to create or refresh the first-pass Obsidian code knowledge base for one or more source repositories. Triggers on requests like "ingest this repo", "analyze this codebase into wiki notes", "build code-kb", "generate overview/architecture/modules/flows", or "把仓库生成知识库".
---

# Obsidian KB Ingest

首次仓库分析。目标：先建有用的广度，再补聚焦的深度。

**始终配合 `obsidian-kb-authoring` 写笔记。** 目录、frontmatter、页面形状、链接契约全部以 authoring 的 `references/` 为准，本 skill **不重复声明**，只负责产出流程。

增量约束（authoring `references/directory-contract.md`）：ingest 每次采用追加式写入——写仓内页、新增只新增页（domains/contracts/use-cases）、**append `global/architecture/coverage.md`**（登记本仓 ingest 深度 + 记录待接合边）、append `log.md`，**不碰**工作区人工叙事页 `system-architecture`；**不**全量重建工作区地图。

## 输入识别

- 源仓库根目录。
- 每个源仓库的名称。
- 用户要广度首扫还是特定子集。

## `{kb-root}` 解析

见 authoring `references/kb-root-resolution.md`（写入类：全找不到则在 `{当前工作目录}/code-kb` 新建）。仅当源仓库根或摄入范围无法推断时才询问，**永不**问 `{kb-root}` 放哪。

## Phase 1：仓库地形扫描 → `repos/{repo}/architecture.md`

1. 信号驱动的快速地形扫描：先读顶层目录 + manifest/构建文件 + 入口文件，再**沿 manifest/build 指向的源码根继续深入**（可能在更深层级），**跳过** `vendor`/`node_modules`/`build`/`dist`/`third_party`/`.git` 等目录。`generated/` 目录默认不深读实现，但 C/C++/通信仓要读取其中的协议标识、service 接口、message/enum 定义和自动生成的 dispatch 元数据。目标是建立仓库形状、技术栈、分层、入口区域的认知——不遍历整棵树，也不固定深度。
2. 读元数据/构建文件（如有，C/C++ 优先）：`CMakeLists.txt`、`Makefile`、`conanfile.txt`/`conanfile.py`、`vcpkg.json`、Bazel `BUILD`、`README`、`package.json`、`go.mod`、`Cargo.toml`、`pyproject.toml`、`pom.xml`、`build.gradle`、`Dockerfile`、部署清单。
3. 识别并读入口文件：`main.c`、`main.cpp`、`src/main.c`、`src/main.cpp`、`app/main.cpp`、`main.go`、`index.ts`、`app.py`、`cmd/*`、`src/main.*`、框架引导模块。
4. 分析源码目录分层（C/C++ 常见 `include/` 与 `src/` 分离、`lib/`、`modules/`），读依赖注入/初始化/装配代码：`main()`、`wire.go`、`container.ts`、`AppModule`、服务注册、路由装配、工厂/单例初始化。
5. 生成 `repos/{repo}/architecture.md`：它同时承担**本仓架构结构（逻辑视图）+ 仓库路由**（链向 modules / flows / 关键 contracts / data-models），并**包含一张 mermaid 架构图**（`graph`/`flowchart TD`，呈现分层与核心模块依赖）。

## Phase 2：模块拆解 → `repos/{repo}/modules/{模块名}.md`

1. 扫核心模块目录，读 index/barrel/export 与公共接口。
2. 分析模块间 import 依赖。
3. 每个真实职责边界一页（实现视图，多实例 → 文件夹）。不要给每个小文件夹都建页。`{模块名}` 文件名默认用中文，只保留必要英文。
4. 在 frontmatter `depends-on` + 正文双链记录模块依赖（影响分析的边）。

## Phase 3：流程发现与分析顺序排序（全量清单）

> 发现先于深挖：先尽可能枚举所有识别到的流程，再排出深度分析顺序。大仓召回不足通常来自这一步过早收敛，因此入口枚举、证据链确认和同质分支归并都要完成后再进入深挖。
>
> **阶段边界**：Phase 3 只做发现、归并、排序和证据登记，深挖执行统一在 Phase 8 进行。这样 Phase 4-7 的补充页、业务域、契约、双链和覆盖记录会先建立好，Phase 8 的深挖才能把新发现内容正确接回视图层。

1. **按需读取流程发现参考，只读相关一份**：
   - C/C++ 仓库或 C/C++ 子系统：读 `references/c-cpp-flow-discovery.md`。
   - 非 C/C++ 仓库或非 C/C++ 子系统：读 `references/general-flow-discovery.md`。
   - 混合仓按本轮要分析的源码范围选择对应参考；不要把两份 reference 都读进上下文。
2. 按选定 reference 枚举入口、确认三段证据链、判断可达性、过滤常量族噪声、合并同质分支，并排出深度分析顺序。
3. 所有识别到的流程都进入同一张 `repos/{repo}/candidate-flow.md` 全量流程清单；分析顺序只决定 Phase 8 的执行先后，清单中的每条流程都要深挖。
4. 不生成单文件浅流程页。一个 flow 只有两种状态：已登记在 `candidate-flow.md` 全量清单，或已深挖并在清单中更新为 `已深挖`。

## Phase 4：补充页（有内容才生成）

- `glossary.md`：**每个术语必须是代码标识符/注释/README/文档里真实出现的词或缩写，带出处；不得编造，缩写无确证不得臆测扩写。**
- `api-surface.md`：路由、proto、OpenAPI、controller、消息契约（契约视图·本仓接口面）。
- `data-models.md`：ORM 模型、schema、proto/types、状态结构。
- `config-and-env.md`：配置加载、env、feature flag。
- `runtime-notes.md`：**error-handling + gotchas 合并**——异常/错误码/重试/降级/告警 + 非显式约束/隐藏约定/已知陷阱。**并兼任跨边界/已知运行风险的人工笔记落点**。任一方内容量大时拆回独立页。
- `key-implementations.md`：复杂算法或重要核心逻辑。
- `testing-strategy.md`：测试目录、脚本、CI、fixture（视图正交，可选）。

## Phase 5：业务域与契约提取（修复孤儿视图，只新增页）

1. **逻辑视图** → `{kb-root}/global/domains/{业务域}.md`：从 glossary、模块职责、README 领域语言聚类出业务域，定义概念、不变量、状态、相邻域，链向实现该域的流程。
2. **契约视图** → `{kb-root}/global/contracts/{契约名}.md`：把首扫发现的跨边界契约（HTTP/RPC API、MQ topic、event、协议消息、TLV/frame）提升为独立契约页，记录消息标识、payload schema、producer/consumer、接收方发现证据。
   - 建页优先用 `obsidian-kb.mjs scaffold contract --repo {repo} --title {契约名}` 拿骨架再填（using-obsidian 有命令清单）。
   - **只找到一端时**（producer 或 consumer 在尚未 ingest 的仓，或对端没搜到）：用 `scaffold contract --partial --side {producer|consumer} --title {契约名} --known {repo} --evidence {证据}`，它一次建好 partial 页**并自动在 `coverage.md` 待接合边表记录**，未知端留空、**别编造假对端**。
3. 这两类是**只新增页**：发现新的加一页，不回改已有页。深度的端到端字段映射留给 deep-analysis。
4. **append `global/architecture/coverage.md`**（partial 契约已由 scaffold 自动记录；其余手动追加）：
- 本仓覆盖度行（深度 = `只地形扫描`/`模块已解析`/`流程已深挖`）
- 本次发现的待接合边（指向未 ingest 仓的调用、单边 partial 契约）
- 已知盲区。这是**只追加**，不回改旧行；接上某端时才把对应行翻"已接合"。

## Phase 6：双向链接（见 authoring `references/link-contract.md`）

1. 模块↔模块依赖：A 依赖 B 则 A 链 `[[modules/B]]`，B 在"被依赖（入）"反向链。
2. 流程↔模块、流程↔契约、流程↔数据、域↔流程：全部双向。
3. `architecture.md`（仓库路由）列出核心流程与模块链接。
4. 检查每个新页至少一条入链。

## Phase 7：工作区更新（按维护方式区分处理）

按 authoring `references/directory-contract.md` 的两种维护方式处理：

- `index.md`：入口，链向各 catalog（人工叙事）。
- `global/architecture/system-architecture.md`：工作区**唯一人工叙事**总览，增量时**不碰**；跨仓结构变化由 `obsidian-kb-update` 刷新。
- `global/architecture/coverage.md`：**只追加**覆盖记录，append 本仓覆盖度行 + 待接合边 + 盲区（见 Phase 5 步骤 4）；它让全局认识对"还没挖的部分"诚实可读。
- `global/contracts/{X}`、`global/domains/{X}`、`global/use-cases/{X}`：**只新增**，发现新边界/新域/新场景才加页，不回改已有页。
- `log.md`：append 本次操作。

跨仓关注点不单独成页：接口归 `global/contracts/`；风险归仓内 `runtime-notes`；依赖与影响范围由 query 从 `depends-on` + 反向双链**现算，不落页**。**不生成** `indexes/`、`_map` 或任何依赖图/数据流/技术栈聚合页。

**Phase 7 不是 ingest 的终点。** 只要 `repos/{repo}/candidate-flow.md` 里存在状态不是 `已深挖` 的流程，必须立刻进入 Phase 8；不得把已经写完 architecture/modules/coverage/log 当作完成。

## Phase 8：深度分析执行 + 视图层回写

Phase 8 是 ingest 的完成门槛，也是 ingest 中唯一允许调用 `obsidian-kb-deep-analysis` 的阶段。开始 Phase 8 前必须确认 Phase 4-7 已完成：补充页已写、业务域/契约已提取、双链已接、coverage/log 已追加。

流程已在 Phase 3 形成全量清单并排出分析顺序。Phase 8 按清单顺序自动串行深挖所有已识别流程，`candidate-flow.md` 是唯一追踪表。

### 按清单顺序自动逐个深挖

深度分析是 ingest 流程的自动续作。播报一次全量流程清单后立刻按清单顺序开工：

1. 确认 Phase 3 已用 `scaffold candidate-flow` 生成 `repos/{repo}/candidate-flow.md`，并按 `obsidian-kb-authoring/templates/candidate-flow.template.md` 填入所有识别到的流程。
2. 按表中的 `分析顺序` 串行调用 `obsidian-kb-deep-analysis`，每完成一条就把对应行 `状态` 更新为 `已深挖`。
3. 如果识别流程很多，仍然继续串行执行；只有用户显式打断、限定范围或要求暂停时才停。
4. 结束 ingest 前重新读取 `candidate-flow.md`：若仍有 `待深挖`、空状态或其它非 `已深挖` 行，不得输出最终完成摘要，继续执行 Phase 8。

### 串行执行模型（执行要求）

优先子 agent 编排：主 agent 为每个流程创建一个专职子 agent，每个子 agent 只做一个 `obsidian-kb-deep-analysis` 任务。

1. 为第一个流程创建**唯一**一个子 agent。
2. 只给它一个流程、入口/接口证据、相关仓库、`{kb-root}`，及"用 `obsidian-kb-deep-analysis` + `obsidian-kb-authoring`"的指令。
3. 等它完成、写完笔记、返回摘要。
4. 检查失败写入、缺失证据、低置信缺口。
5. 然后才创建下一个流程的子 agent。

## 质量底线

- 代码与 README 冲突时以代码为准。
- 业务流程发现不止步于地形扫描。
- 不忽略消息/协议/事件/topic 边界；识别到的所有流程都记入 `candidate-flow.md` 全量清单。
- 入口或依赖不清时标 `confidence: low`。
- 首扫幂等：对未变源码重跑应产生等价笔记。
- 保留人工编辑：合并而非覆盖。

## 收尾检查

收工前逐条过，缺一条就回去补。规则细节见各 references，这里只列动作：

- 新页先 `scaffold {type}` 拿骨架再填，避免手写 frontmatter / section → 见 using-obsidian。
- 每页 `updated` 是今天，`sources` 有不带行号的 durable 证据 → 见 references/frontmatter-schema。
- 关系双向闭环：链出去的页都反向链回来 → 见 references/link-contract。
- 每个 `status: partial` 契约已在 `global/architecture/coverage.md` 记录 → 用 `scaffold contract --partial` 自动记录。
- `api-surface.md` 的跨边界条目均已提升到 `global/contracts/`；本仓存在业务逻辑时 `global/domains/` 非空。缺失则返回 Phase 5 补全。
- `log.md` 记了这轮扫了什么、生成了哪些页。
- `candidate-flow.md` 没有遗留 `待深挖` / 空状态 / 非 `已深挖` 行；若有，返回 Phase 8，不能收工。
