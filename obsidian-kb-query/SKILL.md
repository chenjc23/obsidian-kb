---
name: obsidian-kb-query
description: Use to retrieve read-only business, architecture, flow, contract, module, dependency, risk, and source evidence context from a product-line Obsidian code knowledge base for agents at any development stage.
---

# Obsidian KB Query: Read-Only Agent Context Retrieval

This skill is a read-only context retrieval protocol for agents.

It is not only a human question-answering skill. Use it whenever an agent needs business understanding, code flow context, module boundaries, contracts, dependencies, coupling points, risk evidence, or knowledge gaps during software work.

## Side-Effect Rule

Query is read-only.

Do not run ingest, update, deep-analysis, or any write action by default.

If the knowledge base has gaps, report them under `knowledge_gaps` and `suggested_actions`.

Only write to the knowledge base when the user explicitly requests a write-oriented task.

Always include:

```yaml
side_effects: none
```

## Knowledge Base Discovery

The user does not need to provide `{kb-root}`.

For any read-only knowledge-base request, first discover the knowledge base path. This includes questions about requirements, design, implementation location, impact, debugging, review, testing, contracts, modules, flows, business terms, fields, protocols, risks, or source evidence.

Use this order:

1. Explicit user-provided path.
2. Current directory if it already looks like `code-kb`.
3. `{cwd}/code-kb`.
4. Nearest ancestor `code-kb`.
5. Immediate workspace child named `code-kb`.
6. Best structural match containing `index.md`, `product-line.md`, `global/`, `repos/`, `indexes/`, and `log.md`.

Only ask the user for the path when no candidate exists or multiple candidates are equally plausible.

After finding `{kb-root}`, run the general retrieval protocol below.

## General Retrieval Protocol

1. Classify the task stage: `intent-context`, `design-context`, `implementation-context`, `impact-context`, or `gap-check`.
2. Extract user-mentioned entities: business terms, classes, structs, fields, APIs, files, modules, repos, contracts, protocols, messages, topics, errors, configs, and aliases.
3. Read indexes first: `term-index.md`, `domain-index.md`, `flow-index.md`, `contract-index.md`, `module-index.md`, and `source-index.md`.
4. Use index matches to choose the smallest useful set of pages under `domains/`, `flows/`, `contracts/`, `repos/`, and `global/`.
5. Follow wikilinks and backlinks for coupling, producer/consumer, domain-to-flow, flow-to-module, and flow-to-contract relationships.
6. Read source files only when knowledge confidence is low, source verification is needed, or the user asks for implementation-level accuracy.
7. Return evidence, confidence, affected pages, inferred links, knowledge gaps, suggested actions, and `side_effects: none`.

Specialized retrieval paths, such as field-change impact analysis, are refinements of this general protocol rather than separate entry conditions.

## Output Modes

Use one shared retrieval kernel and choose output mode:

- `agent-context`: default for development workflows.
- `human-report`: use when the user explicitly asks for an explanation or readable report.

Default to `agent-context` when the user is analyzing requirements, designing a solution, preparing code changes, debugging, reviewing, testing, or assessing impact.

## Task Stages

Classify the task:

- `intent-context`: requirements understanding.
- `design-context`: solution design.
- `implementation-context`: implementation location and coding context.
- `impact-context`: dependency, coupling, and risk analysis.
- `gap-check`: knowledge coverage and confidence assessment.

For "modify a class field / struct field / schema field / message field" questions, classify as `impact-context`.

## Retrieval Depth

Choose the smallest useful depth:

- `quick-context`: indexes plus one to three highly relevant pages.
- `standard-context`: indexes, domains, flows, contracts, modules, and risk pages.
- `deep-context`: standard context plus source-code verification.

Use `deep-context` when preparing code changes, when confidence is low, or when contract/risk impact is high.

## Context Checkpoints

Use this skill before:

1. Requirements understanding.
2. Solution design.
3. Code modification.
4. Impact analysis.
5. Debugging business or cross-module flows.
6. Code review.
7. Test design.
8. Documentation or knowledge base maintenance.

## Retrieval Order

Read in this order:

1. `indexes/term-index.md`
2. `indexes/domain-index.md`
3. `indexes/flow-index.md`
4. `indexes/contract-index.md`
5. `indexes/module-index.md`
6. `global/risk-map.md` and relevant `gotchas.md`
7. Relevant pages under `domains/`, `flows/`, `contracts/`, and `repos/`
8. `indexes/source-index.md` and source files only when verification is needed

For field-change impact questions:

1. Identify the class, struct, schema, proto message, TLV field, DTO, entity, or config object.
2. Search `indexes/source-index.md`, `indexes/module-index.md`, `indexes/flow-index.md`, and `indexes/contract-index.md` for the type name, field name, source file, and aliases.
3. Read matching `data-models.md`, `api-surface.md`, contract pages, related flow pages, and related deep flow folders.
4. If communication boundaries are involved, read `跨边界数据流.md`, `global/data-flow.md`, and producer/consumer module pages.
5. Verify against source files when confidence is low or when the field crosses protocol, MQ, RPC, event, socket, or TLV boundaries.
6. Return affected flows, contracts, modules, data structures, cross-boundary messages, tests, risks, and knowledge gaps.

For impact questions, use link graph data from:

```bash
node {using-obsidian-skill-root}/scripts/obsidian-kb.mjs links <target> --json
```

If the helper cannot be located in the current agent environment, compute incoming and outgoing links by scanning wikilinks in `{kb-root}` manually and report that the helper was unavailable.

## Agent Context Output

Use this structure for `agent-context`:

```yaml
query_mode: agent-context
task_stage: design-context
depth: standard-context
confidence: medium
matched_terms:
  - term: 业务开通
    aliases:
      - Service Provisioning
    pages:
      - [[glossary#业务开通]]
domains:
  - name: 业务开通
    page: [[domains/业务开通]]
    relevance: high
flows:
  - name: 业务开通端到端流程
    page: [[flows/业务开通端到端流程]]
    relevance: high
    role: 主流程
contracts:
  - name: AllocateResource
    page: [[contracts/AllocateResource]]
    kind: rpc
    producer:
      - resource-service
    consumers:
      - order-service
    risk: high
modules:
  - repo: order-service
    module: 订单编排
    page: [[repos/order-service/modules/订单编排]]
    role: 入口编排
coupling_points:
  - [[contracts/AllocateResource]]
risks:
  - [[global/risk-map#资源预占一致性]]
kb_evidence:
  - [[indexes/flow-index]]
  - [[flows/业务开通端到端流程]]
source_evidence:
  - repos/order-service/src/orders/create.ts:createOrder()
inferred_from_links:
  - statement: AllocateResource 可能影响订单开通主流程
    evidence:
      - [[flows/业务开通端到端流程]]
      - [[contracts/AllocateResource]]
    confidence: medium
knowledge_gaps:
  - 资源回滚分支缺少 deep-analysis 页面
suggested_actions:
  - 用户授权后可对资源回滚路径执行 deep-analysis
side_effects: none
```

## Human Report Output

Use this structure for `human-report`:

```markdown
## 结论
## 涉及业务域
## 主流程
## 跨仓契约
## 相关模块
## 依赖与耦合
## 风险点
## 证据
## 知识库缺口
```

## Evidence Rules

- Do not return only a conclusion.
- Every knowledge base page, index page, link query, or source file used for judgment must appear in evidence.
- If source code was read, include `source_evidence`.
- If a conclusion is inferred from links, place it under `inferred_from_links`.
- If knowledge base notes conflict with source code, source code wins. Report the page as stale in the response; do not edit it.
- If evidence is insufficient, set `confidence: low`.

## When Knowledge Is Missing

Return `knowledge_gaps` and `suggested_actions`.

Do not run update or deep-analysis unless the user asks for it.
