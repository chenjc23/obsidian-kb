---
name: obsidian-kb-query
description: Use to retrieve read-only business, architecture, flow, contract, module, dependency, risk, and source evidence context from a multi-repository Obsidian code knowledge base for agents at any development stage.
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
6. Best structural match containing `index.md`, `global/`, `repos/`, and `log.md`.

Only ask the user for the path when no candidate exists or multiple candidates are equally plausible.

After finding `{kb-root}`, run the general retrieval protocol below.

## General Retrieval Protocol

1. Classify the task stage: `intent-context`, `design-context`, `implementation-context`, `impact-context`, or `gap-check`.
2. Extract user-mentioned entities: business terms, classes, structs, fields, APIs, files, modules, repos, contracts, protocols, messages, topics, errors, configs, and aliases.
3. Find candidate pages directly from durable notes by matching frontmatter, titles,
   aliases, headings, wikilinks, `sources`, and body text under `domains/`,
   `contracts/`, `repos/`, `global/`, repo-local `glossary.md`, and root
   `index.md`.
4. Prefer fast exact lookup first: use `rg` for user-mentioned business terms,
   identifiers, APIs, messages, topics, errors, configs, and aliases. If the
   bundled helper is available, use `links` for backlink expansion after a target
   page is known.
5. Use candidate matches to choose the smallest useful set of pages under
   `domains/`, `contracts/`, `repos/{repo-name}/flows/`, `repos/`, and `global/`.
6. Follow wikilinks and backlinks for coupling, producer/consumer, domain-to-flow,
   flow-to-module, and flow-to-contract relationships.
7. Apply the Answer Sufficiency Gate below. If KB evidence is insufficient, read
   targeted source files before giving the final answer.
8. Return evidence, confidence, affected pages, inferred links, knowledge gaps,
   suggested actions, and `side_effects: none`.

Specialized retrieval paths, such as field-change impact analysis, are refinements of this general protocol rather than separate entry conditions.

## Output Format

Always return one YAML-style context packet.

Do not switch to a separate human-report Markdown format. Even when the user asks
for an explanation, use the same structured YAML format and put the readable
answer in `key_findings`, with evidence and gaps listed explicitly.

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

- `quick-context`: exact page matches plus one to three highly relevant pages.
- `standard-context`: matched domains, flows, contracts, modules, and risk pages.
- `deep-context`: standard context plus source-code verification.

Use `deep-context` when preparing code changes, when confidence is low, or when contract/risk impact is high.

## Answer Sufficiency Gate

Before answering, decide whether knowledge-base evidence is sufficient.

KB evidence is insufficient when:

- no page directly matches the user-mentioned business term, entity, or alias;
- matched pages have `confidence: low`, `status: stale`, or missing `sources`;
- matched pages only summarize a topic but do not answer the requested cause,
  effect, branch behavior, field semantics, state transition, contract payload,
  producer/consumer logic, or error behavior;
- the question mentions a class, field, API, message, topic, config, error, or
  source file that is absent from matched KB pages;
- linked flow, contract, module, or global pages disagree;
- a communication boundary is named but either sender or receiver behavior is not
  described with evidence.

When evidence is insufficient, read targeted source files before giving the final
answer. Use `sources` from matched pages first, then search the repository with
`rg` for the extracted entities. Keep this read-only and report both
`kb_evidence` and `source_evidence`.

If source lookup still cannot produce a complete answer, answer with explicit
uncertainty instead of compressing the gap into a brief conclusion. Set
`answer_sufficiency: partial` or `answer_sufficiency: insufficient`, list what is
missing, and include suggested next actions.

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

1. Exact matches in frontmatter, title, aliases, headings, wikilinks, `sources`,
   and body text using `rg`, or the bundled helper `search` command when
   available.
2. Relevant pages under `domains/`, `contracts/`, `repos/{repo-name}/flows/`, `repos/`, `global/`,
   repo-local `glossary.md`, and root `index.md`.
3. Backlinks and outgoing links using the bundled helper `links` when available,
   or manual wikilink scanning when unavailable.
4. `global/risk-map.md` and relevant `gotchas.md` when the task involves design,
   implementation, impact, debugging, review, or testing.
5. Source files from matched page `sources`.
6. Additional source files found by `rg` when the Answer Sufficiency Gate fails.

For field-change impact questions:

1. Identify the class, struct, schema, proto message, TLV field, DTO, entity, or config object.
2. Search durable KB pages and frontmatter for the type name, field name, source
   file, and aliases.
3. Read matching `data-models.md`, `api-surface.md`, contract pages, related flow pages, and related deep flow folders.
4. If communication boundaries are involved, read `跨边界数据流.md`, `global/data-flow.md`, and producer/consumer module pages.
5. Verify against source files when confidence is low or when the field crosses protocol, MQ, RPC, event, socket, or TLV boundaries.
6. Return affected flows, contracts, modules, data structures, cross-boundary messages, tests, risks, and knowledge gaps.

For impact questions, use link graph data from:

```bash
node {using-obsidian-skill-root}/scripts/obsidian-kb.mjs links <target> --json
```

If the helper cannot be located in the current agent environment, compute incoming and outgoing links by scanning wikilinks in `{kb-root}` manually and report that the helper was unavailable.

## Query Output

Use this structure for every query response:

```yaml
query_mode: context
task_stage: design-context
depth: standard-context
confidence: medium
answer_sufficiency: partial
source_lookup_performed: true
source_lookup_reason: 知识库缺少资源回滚分支的字段消费证据
matched_entities:
  - 业务开通
  - AllocateResource
relevant_pages:
  - page: [[repos/order-service/glossary#业务开通]]
    role: term
    relevance: high
  - page: [[repos/order-service/flows/业务开通端到端流程]]
    role: flow
    relevance: high
  - page: [[contracts/AllocateResource]]
    role: contract
    relevance: medium
key_findings:
  - AllocateResource 可能影响订单开通主流程。
  - 资源回滚分支证据不足，需要源码或 deep-analysis 补足。
kb_evidence:
  - [[repos/order-service/flows/业务开通端到端流程]]
source_evidence:
  - repos/order-service/src/orders/create.ts:createOrder()
missing_for_complete_answer:
  - 资源回滚分支缺少 deep-analysis 页面
knowledge_gaps:
  - 资源回滚分支缺少 deep-analysis 页面
suggested_actions:
  - 用户授权后可对资源回滚路径执行 deep-analysis
side_effects: none
```

Keep the output compact. Prefer `relevant_pages` over separate domain,
flow, contract, module, risk, and coupling lists unless the user explicitly asks
for a full report. Put the reasoning payload in `key_findings`, backed by
`kb_evidence` and `source_evidence`.

## Evidence Rules

- Do not return only a conclusion.
- Every knowledge base page, helper search/link query, or source file used for judgment must appear in evidence.
- If source code was read, include `source_evidence`.
- If a conclusion is inferred from links, place it under `inferred_from_links`.
- If knowledge base notes conflict with source code, source code wins. Report the page as stale in the response; do not edit it.
- If evidence is insufficient, set `confidence: low`.
- Always include `answer_sufficiency`, `source_lookup_performed`, and
  `source_lookup_reason`.

## When Knowledge Is Missing

Return `knowledge_gaps` and `suggested_actions`.

Do not run update or deep-analysis unless the user asks for it.
