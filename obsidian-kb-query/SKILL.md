---
name: obsidian-kb-query
description: Use to retrieve read-only business, architecture, flow, contract, module, dependency, risk, and source evidence context from a multi-repository Obsidian code knowledge base for agents at any development stage. Triggers on "这块业务怎么实现的", "在哪改", "改这个字段/接口会影响哪些流程", "trace impact", or any need for context before coding, design, debugging, review, or testing.
---

# Obsidian KB Query：只读上下文检索

给 agent 用的只读上下文检索协议。不只是回答人类提问——agent 在需求理解、方案设计、定位实现、影响面判断、调试、评审、测试前，凡是需要业务背景、代码流程、模块边界、契约、依赖、风险证据，都先走这里。

知识库的结构、frontmatter、页面形状、链接契约全部以 `obsidian-kb-authoring` 的 `references/` 为准，本 skill 只负责**怎么检索**，不重复声明结构。

## 只读铁律

query 只读。默认不跑 ingest / update / deep-analysis，不写任何东西。

知识库有缺口时，把缺口写进 `knowledge_gaps` 和 `suggested_actions`，但**不要写回知识库**（不跑 ingest / update / deep-analysis 去补页）。只有用户明确要求写入类任务时才写。

注意：「不要顺手去补」只针对**写回知识库**。去读源码把当前问题答完，是只读检索的一部分，不算补知识库——证据不足时必须自己去读，见下方「答案充分性闸门」。

每次输出都带 `side_effects: none`。

## 找到 `{kb-root}`

见 authoring `references/kb-root-resolution.md`（只读类：完全找不到或多候选同样可能时才问用户，不臆造路径）。找到后走下面的检索协议。

## 检索心法：沿脊柱走，不靠目录翻

对 agent 来说目录不是效率杠杆。知识库的导航和影响面判断靠两样东西：**frontmatter 字段查询** + **正文双链遍历**（见 authoring `references/view-model.md`、`references/link-contract.md`）。

所有检索沿这条消费脊柱定向走，而不是平铺撒网：

```text
use-cases（入口）
  → domains / contracts（概念 + 接口）
    → flows / modules（实现）
      → depends-on + 反向双链（影响，现算）
        → runtime-notes（警示）
```

页面的 `view:` 字段（`usecase`/`logical`/`development`/`runtime`/`contract`/`impact`）就是检索维度：先判断答案落在哪个视图，再决定从脊柱哪一段进、往哪个方向走。命中的页越少越好，只取够回答问题的那几页。

### 跨子系统/多模块问题：先建全局认识，再定向走

问题一旦涉及多个仓/子系统交互（端到端需求分析、跨模块影响、"整个工程怎么运转"），按这个顺序建全局认识,再下脊柱：

- **先读 `architecture/coverage.md`（地基,必读,恒在）**：全局由哪些仓拼成、哪些只地形扫描过、哪些跨仓边只找到一端（`status: partial` 契约）、哪些是已知盲区。这是认识的入口与边界。
- **再读 `architecture/system-architecture.md`（可选,存在才读）**：给已看清部分的跨仓架构图与导航。**增量早期它常常还不存在——别等它,也别因它缺席就停**;它没有恰恰说明跨仓图还画不出,coverage 已把这点如实记下,继续用 coverage + 派生 query 建认识即可。
- 这一步决定了**哪里能下结论、哪里必须标盲区**：命中的子系统若在 coverage 里标着"只地形扫描"或挂着悬挂边，答案就不能假装完整，要把这些缺口如实写进 `knowledge_gaps`。

增量库永远不完整，但 coverage 让"不完整"可读——需求分析因此是全面且诚实的，而不是局部的。

## 两阶段检索

**第一阶段·定位（找锚点页）。** 把问题里的实体抽出来——业务词、类/结构、字段、API、文件、模块、仓库、契约、协议、消息、topic、错误码、配置、别名。用 `rg` 在 `{kb-root}` 全文搜这些词，命中 frontmatter（`title`/`aliases`/`sources`/关系字段）、标题、正文。这一步目录无所谓，就是全文 + frontmatter 命中，拿到一到几个锚点页。

**第二阶段·遍历（沿脊柱扩散）。** 从锚点页开始，靠 `view:` 判方向、靠 frontmatter 关系字段和正文双链逐跳走：

- 关系边（authoring `references/frontmatter-schema.md` Tier 3）：契约页的 `producer`/`consumer`、模块页的 `depends-on`、流程页的 `entry-point`/`related-contracts`/`related-flows`/`related-modules`。
- 正文双链的**反向链**：谁链向了这页。影响面全押在它身上，缺一条反向链就静默漏报。

定位用 `rg`，遍历用人工扫 frontmatter + 双链。

## 问题路由表

先判断问题属于哪一类，直接定位入口和走法，不要从头乱翻：

| 这类问题 | 落在哪个视图 | 从哪进 | 沿脊柱怎么走 |
|---|---|---|---|
| **业务问题**：这块业务在干嘛 / 什么是 X / 谁触发 | 用例 + 逻辑 | `use-cases/{场景}`（端到端场景）或 `domains/{域}` + repo `glossary`（概念） | use-case → 它编排的 flows + 涉及的 domains/contracts；概念类：glossary → domain → 实现该域的 flow |
| **实现定位**：在哪改 / 这功能怎么实现的 / 入口在哪 | 实现 + 运行 | repo `architecture.md`（它本身是仓库路由） | architecture → `modules/{模块}` + `flows/{主题}/`；要细节读 `flows/{主题}/主干流程.md`、`调用树.md`；`entry-point` 字段直接定位代码入口 |
| **影响面**：改这个接口/字段/消息会影响哪些流程 | 契约 + 影响 | 定位实体 → `repos/{repo}/data-models.md` / `api-surface.md` / `contracts/{X}` | 见下方"影响面遍历" |
| **调试**：为什么会失败 / 这条链路哪出问题 | 运行 + 影响 | 相关 `flows/{主题}/` | 主干流程 + 分支页 → `runtime-notes`（错误/重试/陷阱/已知地雷） |
| **评审 / 测试**：改得对不对 / 该测什么 | 实现 + 运行 | 相关 module / flow | 走实现定位那条，外加 `repos/{repo}/testing-strategy.md`、`runtime-notes.md` |

### 影响面遍历（改字段 / 改接口的核心）

这类问题是一次**图遍历**，不是读一两页。

1. 定位被改的类型/字段/消息：在 `data-models.md`、`api-surface.md`、`contracts/{X}` 和 frontmatter 里搜类型名、字段名、源文件、别名。
2. 沿影响边逐跳扩散：契约页的 `producer`/`consumer`、模块页的 `depends-on`、流程页的 `related-contracts`/`entry-point`，**加上正文双链的反向链**，一路扩到 flows → use-cases。
3. **现算爆炸半径**：沿 frontmatter `depends-on` + 正文反向双链做图遍历（无现成图，影响视图就是这次遍历本身）。
4. 跨消息边界时，读 `contracts/{X}` + 该流程的 `跨边界数据流.md` + 收发两端模块；字段穿协议、MQ、RPC、event、socket、TLV 边界时尤其要追到接收方。
   - 命中 `status: partial` 契约 = **已知的未接边**（对端仓还没 ingest）：这不是"无下游",而是影响面在此截断且对端未知。把它如实报进 `knowledge_gaps`（"X 契约对端待 ingest,影响可能延伸到未入库的仓"），别假装影响到此为止。
5. 收尾读相关 `runtime-notes.md`（已知地雷/陷阱）。
6. 给出：受影响的 flows、契约、模块、数据结构、跨边界消息、测试、风险、知识缺口（含 coverage 里相关的悬挂边/盲区）。

## 答案充分性闸门（强制：先补全再回答，别把读源码甩给用户）

回答前先过这道闸门：判断知识库证据够不够**直接、完整**地回答问题。出现下列情况就说明 KB 太浅，**必须先自己去读源码补全认识，再输出答案**：

- 没有页面直接命中用户说的业务词、实体或别名。
- 命中的页 `confidence: low` 或缺 `sources`。
- 命中的页只是概述主题，答不出用户要的原因、效果、分支行为、字段语义、状态迁移、payload、收发逻辑或错误行为。
- 命中的页只讲了模块职责或高层架构，而问题要的是详细行为、影响推理、实现位置、数据血缘、分支条件、调用顺序、失败处理或测试策略。
- 问题提到的类、字段、API、消息、topic、配置、错误、源文件在命中页里根本没有。
- 链到的 flow、契约、模块、工作区页彼此矛盾。
- 点名了某个通信边界，但收发某一方的行为没有证据支撑。

**这道闸门是强制流程，不是事后建议。** 证据不足时：

- ❌ 不要先用知识库现有内容凑一个答案、再在结尾建议"用户可以去读 X 源码获取完整信息"——这正是要消除的错误行为。
- ❌ 不要停下来问用户"要不要我去读源码"。读源码是只读检索的一部分，**自己直接去读，不需要任何确认**。
- ✅ 立刻去读：从命中页的 `sources` 起，顺双链到邻近页读它们的 `sources`，再用 `rg` 在仓库里搜抽出的实体（类、字段、API、消息、topic、配置、错误码、源文件）。读到足以完整回答问题为止。
- ✅ 最终只输出**一个已经融合了源码证据的完整答案**。读过的源码在"详细分析"正文里逐个说明它支撑了哪个判断；knowledge 页仍列进 `kb_evidence`，并置 `source_lookup_performed: true`。

只有把相关源码都读了仍然答不全时，才带着明确的不确定性回答：在正文讲清还缺什么，把"还需要哪些信息 / 哪些页该补"写进 `knowledge_gaps` 和 `suggested_actions`。`suggested_actions` 是给知识库维护用的后续建议，**不是**把"去读源码"这件本就该自己做的事甩回给用户。

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
