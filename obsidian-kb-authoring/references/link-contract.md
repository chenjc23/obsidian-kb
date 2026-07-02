# 链接契约（Link Contract）

**对 agent 而言，知识库的导航与影响面判断不靠目录，靠双链遍历。** 因此双链的完整性和双向性，比任何目录调整都重要。影响分析依赖这些关系边：缺一条反向链，影响面就静默漏报。

## 核心原则：双链是关系的唯一真相源

- 关系**只在正文用 wikilinks 表达**，作为唯一真相源。
- frontmatter 里的关系字段（`producer`/`consumer`/`depends-on`/`related-*`/`entry-point`，见 [frontmatter-schema.md](frontmatter-schema.md) Tier 3）是**给 query 影响面遍历用的结构化边**，应与正文双链一致，由工具同步校验，**不与正文各自独立手维护**。
- 影响面 / 依赖图不物化成页：query 从这些双链 + frontmatter 即时遍历得出，永远 fresh。

## 必须维护的双向关系

下列关系**必须**双向可达（A 链 B，则 B 必有指向 A 的反向链）：

| 关系 | 正向 | 反向 |
|---|---|---|
| 用例 → 流程 | use-case 列出编排的 flows | flow 在"相关用例"链回 |
| 用例 → 域 | use-case 列涉及域 | domain 在"实现该域的流程/用例"链回 |
| 域 → 流程 | domain 列实现流程 | flow 在 frontmatter `domain` + 正文链回 |
| 流程 → 契约 | flow 跨边界处链 contract | contract 在"使用该契约的流程"链回 |
| 流程 → 子模块/仓概览 | flow 列涉及子模块或仓概览 | submodule/overview 在"相关流程"链回 |
| 契约 → producer/consumer | contract 列两端 | 两端 repo/submodule/flow 链回 contract |
| 子模块 → 子模块 | submodule `depends-on` + 正文 | 被依赖子模块在"被依赖（入）"反向链 |
| 风险/约束 → 流程/契约/子模块/证据 | `constraints` 或 `resource-analysis` 条目列受影响对象 | 对象在"风险链/约束链"链回对应页 |
| 术语 → 真定义 | glossary 术语链向 domain/flow/data-model | — (glossary 是索引,单向可接受) |

## 强制 + 可校验字段（影响分析的传播边）

这几个字段是影响面计算的**图的边**，必须存在且可被 `obsidian-kb-lint` / query 校验：

- 契约页：`producer`、`consumer`（缺失 → 影响传播断裂）。
- overview / submodule 页：`depends-on`（缺失 → 依赖链断裂）。
- 流程页：`entry-point`、`related-contracts`（缺失 → 无法从变更点回溯到流程）。

校验规则：

- frontmatter 关系字段引用的目标页必须存在（不得断链）。
- frontmatter 声明的关系，正文应有对应 wikilink；反之亦然。
- 声明了 `producer`/`consumer` 的契约，两端页面必须有反向链回该契约。

### 单边契约（`status: partial`）的例外

增量逐仓 ingest 时，跨仓边常只先找到一端。这是唯一允许的双向缺口例外：

- `status: partial` 的契约**允许只有一端**（producer 或 consumer 之一），已知端正常双向链回，未知端留空。
- 代价是**必须在 `global/architecture/coverage.md` 待接合边表记录**——缺口不许静默，要显式可读，query 才能把它当"已知的未接边"报出来，而不是漏报。
- 对端的仓 ingest 进来后：补全契约对端 + 双向链接、`status` 翻回 `active`、记录行翻成"已接合"。
- 校验：`status: partial` 的契约**必须**在 coverage 待接合边表有对应行；`active` 契约则两端齐全、双向闭环（不得停在 partial 装作完整）。

## wikilink 写法

wikilink **只指向 KB 页面**；引用源码用 `sources` frontmatter 或正文 inline `code`，**绝不**写 `[[l2ss_db.c]]` 这类指向源码文件的 wikilink。

知识库页面一律用 Obsidian wikilinks：

```markdown
[[global/domains/业务开通]]
[[global/use-cases/服务开通]]
[[repos/order-service/usecases/服务开通]]
[[repos/order-service/flows/业务开通端到端流程/主干流程]]
[[global/contracts/AllocateResource]]
[[repos/resource-service/submodules/资源分配/overview]]
[[repos/order-service/constraints#资源预占一致性]]
[[repos/order-service/data-models#OrderRequest]]
```

## 链接闭环检查（写入前）

- 有意义的关系都有反向链（除 glossary 索引等明确单向场景）。
- 新页面至少有一条入链，或是有意为之的入口页（`index`）。
- 深流程文件夹内：`调用树`/`主干流程`/分支页/`跨边界数据流`/`数据结构` 之间的双链闭环（具体见 obsidian-kb-deep-analysis Phase 5）。
- 跨边界处的 `[[global/contracts/X]]` 链接存在，且契约页反向列出"使用该契约的流程"。
