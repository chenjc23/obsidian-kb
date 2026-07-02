---
name: using-obsidian
description: Use when working with a multi-repository Obsidian code knowledge base, including requirements context, solution design context, repo ingest, knowledge updates, read-only agent query, linting, or deep analysis. This is the routing skill for the obsidian-kb-* suite.
---

# Using Obsidian Multi-Repository Code Knowledge Skills

Use this as the entry point for the Obsidian/code-kb skill suite.

The suite builds and operates a multi-repository knowledge base. The primary consumer is an agent that needs business, architecture, flow, contract, repo/submodule, dependency, and risk context while doing software work.

## Default Paths

Default knowledge base root:

```text
{current working directory}/code-kb
```

Use a user-provided path only when the user explicitly specifies one.

The user does not need to provide the knowledge base path for normal knowledge-base work.

Resolve `{kb-root}` for any request that asks to read, query, analyze, inspect, explain, design from, debug with, review with, update, lint, or assess impact through the knowledge base.

When no path is provided, locate `{kb-root}` by running the `resolve` helper (see Helper Commands below) — do not search manually. Do not ask where the KB is or should be created unless `resolve` reports ambiguous candidates.

Do not hardcode local paths in examples or generated instructions. Prefer:

- `{workspace-root}`
- `{kb-root}`
- `{repo-root}`
- `{repo-name}`

This skill includes a zero-dependency helper script at:

```text
scripts/obsidian-kb.mjs
```

When the whole `skills/` folder is copied to another agent, this helper moves with `using-obsidian`.

Locate `{kb-root}` by running the helper — do not search manually:

```bash
node {using-obsidian-skill-root}/scripts/obsidian-kb.mjs resolve [--kb-root <path>] --json
```

It deterministically locates the kb-root (explicit → cwd itself → `cwd/code-kb` → nearest ancestor `code-kb/` → best of workspace-child candidates) and returns `{ kbRoot, found, source, candidates }`. Act on it:

- `found: true` → use `kbRoot`.
- `found: false`, `source: default` (no existing KB) → write tasks (ingest / update / deep-analysis writes, and building) use the returned `kbRoot` (`cwd/code-kb`), which `init` creates; read tasks (query / lint) do not fabricate — report "KB not yet built" as a gap and only ask the user when truly blocked.
- `source: ambiguous` → have the user pick one of `candidates`, then pass it via `--kb-root`; never guess.

Never ask where `{kb-root}` should live. The resolution algorithm's single source is `scripts/lib/kb-root.mjs`.

### Helper Commands

零依赖 helper（`scripts/obsidian-kb.mjs`）提供这些子命令，写页前用 `scaffold` 拿合规骨架文本：

```bash
# 列出全部可 scaffold 的页型
node {using-obsidian-skill-root}/scripts/obsidian-kb.mjs types

# 按页型吐单页骨架（机械字段已填，无 {{ }} 残留）；不落盘，填好后 Write 到打印的目标路径
node {…}/scripts/obsidian-kb.mjs scaffold overview --repo {repo} --title {仓库名} --kb-root {kb-root}

# 复合型（submodule/flow）逐件吐：写哪件传 --member 吐哪件，不一次吐全套
# submodule 成员：上下文/功能/数据结构/特性耦合/状态迁移规则/接口/规格约束
node {…}/scripts/obsidian-kb.mjs scaffold submodule --repo {repo} --topic {子模块主题} --member 上下文 --kb-root {kb-root}

# flow 成员：调用树/主干流程/分支主题/跨边界数据流/数据结构/自查报告（6 件跨 6 个 stage 写）
node {…}/scripts/obsidian-kb.mjs scaffold flow --repo {repo} --topic {分析主题} --member 调用树 --kb-root {kb-root}

# 单边契约：建 partial 页 + 自动在 global/architecture/coverage.md 记录待接合边
node {…}/scripts/obsidian-kb.mjs scaffold contract --partial --side producer \
  --title {契约名} --known {repo} --evidence "{path:func()}" --kb-root {kb-root}

# 流程编排(ingest / deep-analysis 阶段驱动)
node {…}/scripts/obsidian-kb.mjs pipeline status --repo {repo} --kb-root {kb-root}
node {…}/scripts/obsidian-kb.mjs pipeline next --repo {repo} --kb-root {kb-root}
node {…}/scripts/obsidian-kb.mjs pipeline done {stage} --repo {repo} --kb-root {kb-root}
node {…}/scripts/obsidian-kb.mjs pipeline next --repo {repo} --pipeline deep-analysis --topic {主题} --kb-root {kb-root}

# 其余：init / lint / report（页面结构单一来源 = obsidian-kb-authoring/templates/）
```

`scaffold` 只吐骨架文本、不落盘：机械字段（title/repo/created/updated）已填，其余 `<!-- 填:… -->` 由 agent 补齐后自己 `Write` 到打印的目标路径。文件只在被填好时才出现在磁盘,`pipeline` 的 `exists` 闸门因此可信。写入前自查目标页是否已存在——存在则合并、不覆盖人工内容。复合型（submodule/flow）逐件吐,须传 `--member`,写哪件吐哪件、不一次吐全套。`scaffold contract --partial` 例外：它是真写入(建 partial 页 + 记 coverage 待接合边)的原子操作。

After discovering `{kb-root}`, route the task by intent rather than by the wording of the user's example. For read-only tasks, use `obsidian-kb-query`; for write-oriented tasks, use the smallest write skill that matches the intent.

## Skill Routing

Choose the smallest set of skills that covers the user's intent:

| User intent | Required skills |
|---|---|
| Initialize a multi-repository knowledge base | `obsidian-kb-authoring` and bundled helper `scripts/obsidian-kb.mjs init` |
| Create a multi-repository knowledge base from repositories | `obsidian-kb-ingest` + `obsidian-kb-authoring` |
| Update existing notes after code changes | `obsidian-kb-update` + `obsidian-kb-authoring` |
| Retrieve business/code context for agent work | `obsidian-kb-query` |
| Check completeness, stale pages, or link health | `obsidian-kb-lint` |
| Deeply analyze a function, algorithm, or business flow | `obsidian-kb-deep-analysis` + `obsidian-kb-authoring` |
| Revise page schema, naming, or link conventions | `obsidian-kb-authoring` |

When multiple intents appear in one request, run them in this order:

1. `obsidian-kb-query` to understand current knowledge.
2. `obsidian-kb-ingest` or `obsidian-kb-update` to create or revise pages when explicitly requested.
3. Let `obsidian-kb-ingest` finish its full phase order before any deep-analysis execution: discovery first, then supporting pages/view-layer pages/linking/coverage/log, then automatic serial deep analysis.
4. `obsidian-kb-deep-analysis` for focused flow analysis; when called from ingest, every identified flow is automatic serial work, while `candidate-flow.md` is the full flow tracking ledger.
5. `obsidian-kb-lint` to verify the final knowledge base.

## Query Is Read-Only

`obsidian-kb-query` is a read-only context retrieval protocol.

It may read knowledge base pages, link graphs, and source files for verification. It must not run `ingest`, `update`, or `deep-analysis` by default.

If query finds a gap that affects development judgment, report:

- `knowledge_gaps`
- `suggested_actions`
- `side_effects: none`

Only write or update notes when the user explicitly asks for a write action, or when the current task is itself a knowledge base update or deep analysis.

## Context Checkpoints

Call `obsidian-kb-query` when the agent needs business or code context:

1. Before requirements understanding.
2. Before solution design.
3. Before code modification.
4. Before impact analysis.
5. Before debugging business or cross-submodule flows.
6. Before code review.
7. Before test design.
8. Before documentation or knowledge base maintenance.

## Deep Analysis Candidate Orchestration

When `obsidian-kb-ingest` reaches deep-analysis execution, it must already have completed its earlier phases: repository terrain, overview/submodules, flow discovery/ranking, supporting pages, view-layer domain/contract extraction, bidirectional links, coverage, and log.

During ingest, Phase 3 discovers, deduplicates, and orders flows for analysis; Phase 8 is the single execution gate for deep analysis. Every identified flow runs automatically in that order. `candidate-flow.md` is the traceable ledger for all identified flows, analysis order, risk, and status.

If multiple flows need deep analysis and sub-agents are available, the main agent must orchestrate them serially:

1. Create exactly one sub-agent for the first queued flow.
2. Give that sub-agent only one flow, its entry/interface evidence, the relevant repository roots, `{kb-root}`, and the instruction to use `obsidian-kb-deep-analysis` plus `obsidian-kb-authoring`.
3. Wait until that sub-agent finishes, writes its notes, and returns a summary.
4. Review the result for obvious missing files, low-confidence gaps, or failed writes.
5. Only then create the next sub-agent for the next queued flow.

Do not create multiple deep-analysis sub-agents in parallel. Do not batch-create sub-agents. Do not create the next sub-agent until the previous sub-agent has fully completed and returned its result. Cross-flow parallelism is forbidden because deep analyses update shared pages such as `data-models.md`, `architecture.md`, `overview.md`, `constraints.md`, `resource-analysis.md`, `global/domains/`, `global/use-cases/`, `global/contracts/`, and `log.md`.

If sub-agents are unavailable, the main agent must run the queued flows one by one in the same serial order.

After all queued deep analyses finish:

- Run or recommend `obsidian-kb-lint`.
- Summarize completed flows, generated pages, view-layer pages added or connected, cross-boundary messages, evidence confidence, and remaining gaps.

## Shared Authoring Rules

For any task that writes or edits notes, apply `obsidian-kb-authoring`.

Preserve these invariants:

- Follow `obsidian-markdown` for Obsidian syntax.
- Follow `obsidian-kb-authoring` for multi-repository knowledge engineering rules.
- Write knowledge content in Chinese by default.
- Keep code identifiers, file paths, library names, API names, protocol names, and technical terms in original spelling.
- Every generated page has Obsidian properties with `title`, `type`, `repo`, `created`, `updated`, `sources`, `confidence`, and `status`.
- Do not invent code details. If evidence is incomplete, mark `confidence: low` and explain what is missing.
- Maintain bidirectional wikilinks for meaningful domain, flow, contract, overview/submodule, risk, and source relationships.
- Avoid orphan pages.
- Record meaningful ingest, update, deep-analysis, and repair operations in `log.md`.
- For communication-domain flows, continue through message, protocol, event, RPC, MQ, socket, and TLV boundaries when evidence exists in the workspace.

## Work Pattern

1. Resolve `{kb-root}` and source repository roots.
2. Route to the execution skill.
3. Read the smallest useful set of notes and sources.
4. Write or update notes only when the user requested a write-oriented task.
5. Run or recommend bundled helper `lint` after write-oriented tasks.
6. Summarize changed files, evidence, confidence, and remaining uncertainty.

## Do Not

- Do not treat query as permission to write.
- Do not skip `sources`.
- Do not use line numbers in durable wiki references; use `path:functionName()` or `path:className.methodName()` instead.
- Do not generate single-repo top-level folders; use `repos/{repo-name}/`.
- Do not use placeholders such as "similar logic", "same as above", or "omitted" to skip code paths in deep analysis.
