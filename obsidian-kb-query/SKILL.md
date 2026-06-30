---
name: obsidian-kb-query
description: Use to retrieve read-only business, architecture, flow, contract, submodule, dependency, risk, and source evidence context from a multi-repository Obsidian code knowledge base for agents at any development stage. Triggers on "这块业务怎么实现的", "在哪改", "改这个字段/接口会影响哪些流程", "trace impact", or any need for context before coding, design, debugging, review, or testing.
---

# Obsidian KB Query：只读上下文检索

给 agent 用的只读上下文检索协议。不只是回答人类提问——agent 在需求理解、方案设计、定位实现、影响面判断、调试、评审、测试前，凡是需要业务背景、代码流程、仓/子模块边界、契约、依赖、风险证据，都先走这里。

知识库的结构、frontmatter、页面形状、链接契约全部以 `obsidian-kb-authoring` 的 `references/` 为准，本 skill 只负责**怎么检索**，不重复声明结构。

## 只读约束

query 只读。默认不跑 ingest / update / deep-analysis，不写任何东西。

知识库有缺口时，把缺口写进 `knowledge_gaps` 和 `suggested_actions`，但**不要写回知识库**（不跑 ingest / update / deep-analysis 去补页）。只有用户明确要求写入类任务时才写。

注意：「不要顺手去补」只针对**写回知识库**。去读源码把当前问题答完，是只读检索的一部分，不算补知识库——证据不足时必须自己去读，见下方「答案充分性检查」。

每次输出都带 `side_effects: none`。

## 找到 `{kb-root}`

见 authoring `references/kb-root-resolution.md`（只读类：完全找不到或多候选同样可能时才问用户，不臆造路径）。找到后走下面的检索协议。

## 检索策略：先选入口，再沿关系边收敛

目录只用于快速缩小候选范围，不能代替证据检索。知识库的导航和影响面判断靠两样东西：**frontmatter 字段查询** + **正文双链遍历**（见 authoring `references/view-model.md`、`references/link-contract.md`）。

先判断问题落在哪个视图，再选合适入口：

```text
业务/场景问题        → global/use-cases / repos/{repo}/usecases → flows / contracts / domains
概念/边界问题        → domains / glossary → architecture / overview / submodules / flows
实现定位问题         → architecture / overview → submodules / flows / sources
接口/协议/消息问题    → contracts / api-surface / api-depend → producer / consumer / flows
调试/运行问题        → flows → constraints / resource-analysis / contracts / submodules
评审/测试问题         → submodules / flows → constraints / resource-analysis / human-interfaces
影响分析问题         → 被改实体 → contracts / data-models / submodules / overview → 反向双链扩散
```

进入锚点页后，再沿 `type`（及其派生视图透镜）、frontmatter 关系字段和正文双链收敛到足够回答问题的页。视图透镜由 `type` 派生（映射见 authoring `references/view-model.md`），共五个常驻视图：用例 / 逻辑 / 实现 / 运行 / 契约。。

从最可能的入口开始，小步扩展；证据足够直接回答问题时停止，证据不足或链路断裂时继续沿关系边、反向链和 `sources` 扩展。不要为了省页数而提前收敛，也不要把无关目录扫完。

### 跨子系统/多模块问题：先建全局认识，再定向走

问题一旦涉及多个仓/子系统交互（端到端需求分析、跨模块影响、"整个工程怎么运转"），按这个顺序建全局认识,再进入具体查询路径：

- **先读 `global/architecture/coverage.md`（基础入口,必读,恒在）**：全局由哪些仓拼成、哪些只地形扫描过、哪些跨仓边只找到一端（`status: partial` 契约）、哪些是已知盲区。这是认识的入口与边界。
- **再读 `global/architecture/system-architecture.md`（可选,存在才读）**：给已看清部分的跨仓架构图与导航。**增量早期它常常还不存在；存在则读取，不存在则继续**。它缺席通常说明跨仓图还画不出，coverage 已把这点如实记下，继续用 coverage + 派生 query 建认识即可。
- 这一步决定了**哪里能下结论、哪里必须标盲区**：命中的子系统若在 coverage 里标着"只地形扫描"或存在待接合边，答案不能输出完整结论，要把这些缺口如实写进 `knowledge_gaps`。

增量库永远不完整，但 coverage 让"不完整"可读——需求分析因此是全面且诚实的，而不是局部的。

## 两阶段检索

**第一阶段·定位（找锚点页）。** 把问题里的实体抽出来——业务词、类/结构、字段、API、文件、模块、仓库、契约、协议、消息、topic、错误码、配置、别名。用 `rg` 在 `{kb-root}` 全文搜这些词，命中 frontmatter（`title`/`aliases`/`sources`/关系字段）、标题、正文。这一步目录无所谓，就是全文 + frontmatter 命中，拿到一到几个锚点页。

**第二阶段·遍历（沿关系边扩散）。** 从锚点页开始，靠 `type`/页面所在 catalog 判方向、靠 frontmatter 关系字段和正文双链逐跳走：

- 关系边（authoring `references/frontmatter-schema.md` Tier 3）：契约页的 `producer`/`consumer`、overview/submodule 页的 `depends-on`、流程页的 `entry-point`/`related-contracts`/`related-flows`/`related-submodules`。
- 正文双链的**反向链**：谁链向了这页。影响面全押在它身上，缺一条反向链就静默漏报。

定位用 `rg`，遍历用人工扫 frontmatter + 双链。

### 影响面遍历（改字段 / 改接口的核心）

这类问题是一次**图遍历**，不是读一两页。

1. 定位被改的类型/字段/消息：在 `data-models.md`、`api-surface.md`、`global/contracts/{X}` 和 frontmatter 里搜类型名、字段名、源文件、别名。
2. 沿影响边逐跳扩散：契约页的 `producer`/`consumer`、overview/submodule 页的 `depends-on`、流程页的 `related-contracts`/`entry-point`，**加上正文双链的反向链**，一路扩到 flows → use-cases。
3. **现算影响范围**：沿 frontmatter `depends-on` + 正文反向双链做图遍历（无现成图，影响分析就是这次遍历本身）。
4. 跨消息边界时，读 `global/contracts/{X}` + 该流程的 `跨边界数据流.md` + 收发两端 overview/submodule；字段穿协议、MQ、RPC、event、socket、TLV 边界时尤其要追到接收方。
   - 命中 `status: partial` 契约 = **已知的未接边**（对端仓还没 ingest）：这不是"无下游",而是影响面在此截断且对端未知。把它如实报进 `knowledge_gaps`（"X 契约对端待 ingest,影响可能延伸到未入库的仓"），别假装影响到此为止。
5. 收尾读相关 `constraints.md` / `resource-analysis.md`（已知约束、运行风险、资源风险）。
6. 给出：受影响的 flows、契约、overview/submodule、数据结构、跨边界消息、测试、风险、知识缺口（含 coverage 里相关的待接合边/盲区）。

## 答案充分性检查（强制：先补全再回答）

回答前先做这项检查：判断知识库证据够不够**直接、完整**地回答问题。出现下列情况就说明 KB 太浅，**必须先自己去读源码补全认识，再输出答案**：

- 没有页面直接命中用户说的业务词、实体或别名。
- 命中的页 `confidence: low` 或缺 `sources`。
- 命中的页只是概述主题，答不出用户要的原因、效果、分支行为、字段语义、状态迁移、payload、收发逻辑或错误行为。
- 命中的页只讲了模块职责或高层架构，而问题要的是详细行为、影响推理、实现位置、数据血缘、分支条件、调用顺序、失败处理或测试策略。
- 问题提到的类、字段、API、消息、topic、配置、错误、源文件在命中页里根本没有。
- 链到的 flow、契约、模块、工作区页彼此矛盾。
- 点名了某个通信边界，但收发某一方的行为没有证据支撑。

**这项检查是强制流程，不是事后建议。** 证据不足时：

- ❌ 不要先用知识库现有内容拼接不完整答案。
- ❌ 不要停下来问用户"要不要我去读源码"。读源码是只读检索的一部分，**自己直接去读，不需要任何确认**。
- ✅ 立刻去读：从命中页的 `sources` 起，顺双链到邻近页读它们的 `sources`，再用 `rg` 在仓库里搜抽出的实体（类、字段、API、消息、topic、配置、错误码、源文件）。读到足以完整回答问题为止。
- ✅ 最终只输出**一个已经融合了源码证据的完整答案**。读过的源码在"详细分析"正文里逐个说明它支撑了哪个判断；knowledge 页仍列进 `kb_evidence`，并置 `source_lookup_performed: true`。

只有把相关源码都读了仍然答不全时，才带着明确的不确定性回答：在正文讲清还缺什么，把"还需要哪些信息 / 哪些页该补"写进 `knowledge_gaps` 和 `suggested_actions`。`suggested_actions` 是给知识库维护用的后续建议，**不是**把"去读源码"这件本就该自己完成的事交回给用户。

## 输出格式

先给一段紧凑的 YAML 上下文包，再接一段直接回答问题的详细 Markdown。

YAML 包只为可追溯，保持短，不塞内部路由元数据（不要 `query_mode`/`task_stage`/`depth`/`matched_entities`/`relevant_pages` 之类）。

```yaml
confidence: medium
source_lookup_performed: true
source_lookup_reason: "{为什么需要或不需要读源码；没读写 not needed}"
kb_evidence:
  - "[[path/to/relevant-page]]"
knowledge_gaps:
  - "{知识库缺口；没有则写 []}"
suggested_actions:
  - "{下一步建议；没有则写 []}"
side_effects: none
```

紧接着给详细回答：

````markdown
## 详细分析

{按问题自然组织正文。可用"受影响范围""原因链路""风险与不确定性""建议"等小标题，但不固定套用；问的是设计、定位、调试、测试或概念，就用更贴合的标题。}

{读了源码就在正文里列出源码文件和它们支撑的判断。}
````

推理放在详细 Markdown 里，由 `kb_evidence` 和正文提到的源码支撑；YAML 包保持紧凑。

## 证据规则

- 不要只给结论。
- 每个用于判断的知识库页、源文件都要出现在证据里：页进 `kb_evidence`，源码在正文说明。
- 结论是从双链推出来的，就在正文标明"由链接推断"。
- 知识库与源码冲突时以源码为准；在回答里指出该页与源码冲突、可能过时，但**不要改它**。
- 证据不足时 `confidence: low`。
- 始终带 `source_lookup_performed` 和 `source_lookup_reason`。

## 知识库缺东西时

写 `knowledge_gaps` 和 `suggested_actions`。不要擅自跑 update 或 deep-analysis，除非用户要求。
