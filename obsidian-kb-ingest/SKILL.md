---
name: obsidian-kb-ingest
description: Use to create or refresh the first-pass Obsidian code knowledge base for one or more source repositories. Triggers on requests like "ingest this repo", "analyze this codebase into wiki notes", "build code-kb", "generate overview/architecture/modules/flows", or "把仓库生成知识库".
---

# Obsidian KB Ingest

Use this for first-time repository analysis. The goal is to build useful breadth first, then add focused depth.

Always combine with `obsidian-kb-authoring` when writing notes.

## Inputs To Identify

- Source repository root(s).
- Repository name for each source repo.
- Whether the user wants a broad first pass or a specific subset.

## Knowledge Base Root Resolution

Do not ask the user where to place the knowledge base.

Resolve `{kb-root}` deterministically:

1. If the user explicitly specifies a knowledge base path, use that path.
2. Otherwise, if the current agent working directory already contains a knowledge base directory, use the detected knowledge base directory.
3. Otherwise, use `{current agent working directory}/code-kb`.

A detected knowledge base directory is a directory named `code-kb/` or a directory that contains several of:

- `index.md`
- `global/`
- `repos/`
- `log.md`

Only ask the user about source repository roots or ingest scope when they cannot be inferred. Never ask where `{kb-root}` should be.

## Phase 1: Repository Terrain Scan

1. Read the repo root structure to depth 2 only as a fast terrain scan.
2. Read metadata files, if present: `README.md`, `package.json`, `go.mod`, `Cargo.toml`, `pyproject.toml`, `pom.xml`, `build.gradle`, `Dockerfile`, deployment manifests.
3. Identify and read entry files: `main.go`, `index.ts`, `app.py`, `cmd/*`, `src/main.*`, framework bootstrap modules.
4. Generate `repos/{repo-name}/overview.md`.

Depth 2 is not a limit on business-flow discovery. It is only used to understand repository shape, technology stack, and likely entry areas. Continue deeper whenever entry registration, protocol dispatch, module boundaries, or business-flow evidence points into nested source directories.

## Phase 2: Architecture Analysis

1. Analyze source directory structure and identify layering.
2. Read dependency-injection or initialization code, such as `wire.go`, `container.ts`, `AppModule`, `main`, service registries, or router setup.
3. Identify real design patterns from code, not guesses.
4. Generate `repos/{repo-name}/architecture.md`.

## Phase 3: Module Decomposition

1. Scan core module directories.
2. Read index/barrel/export files and public interfaces.
3. Analyze import dependencies between modules.
4. Generate one page per core module: `repos/{repo-name}/modules/{模块中文名}.md`.

Do not generate a page for every tiny folder. Prefer pages that match real responsibility boundaries.

## Phase 4: Flow Tracing

1. Start from API routes, CLI commands, event handlers, jobs, consumers, protocol dispatchers, message handlers, state-machine transitions, or public service methods.
2. Deliberately discover all business-critical flows the agent can justify from code evidence, including flows found during the earlier terrain scan.
3. Search beyond depth 2 for entry and interface evidence:
   - HTTP routes, controllers, OpenAPI files, RPC servers, proto files, IDL files, and service registries.
   - MQ topics, event names, producers, consumers, subscribers, and handlers.
   - TLV definitions, protocol message IDs, command IDs, operation codes, encode/decode functions, dispatch maps, and handler registries.
   - Socket read/write loops, frame parsers, packet routers, and session handlers.
   - CLI commands, scheduled jobs, timers, workers, and task executors.
   - Public service methods, orchestration services, state-machine entry points, and workflow coordinators.
4. Rank candidate flows by business value, external interface exposure, cross-module or cross-repo coupling, protocol complexity, error/retry/rollback risk, and naming evidence from README or domain terms.
5. Generate `repos/{repo-name}/flows/{流程中文名}.md` for the important first-pass flows. If there are too many flows, cover the highest-value and highest-risk ones first, and record the remaining candidates in the deep-analysis confirmation table.

## Phase 5: Supplementary Pages

Generate or update:

- `repos/{repo-name}/glossary.md` from business terms, aliases, domain language,
  code identifiers with business meaning, status names, protocol terms, and
  README/domain wording.
- `repos/{repo-name}/api-surface.md` from routes, proto files, OpenAPI specs, controllers, or message contracts.
- `repos/{repo-name}/data-models.md` from ORM models, schemas, proto/types, state structures.
- `repos/{repo-name}/config-and-env.md` from config loading, env vars, feature flags.
- `repos/{repo-name}/error-handling.md` from exceptions, error codes, retry, fallback, alert paths.
- `repos/{repo-name}/testing-strategy.md` from test folders, scripts, CI, fixtures.
- `repos/{repo-name}/key-implementations.md` for complex algorithms or important core logic.
- `repos/{repo-name}/gotchas.md` for non-obvious constraints, hidden conventions, and known traps.

## Phase 6: Bidirectional Links

1. Module-to-module dependencies: if module A depends on module B, link A to `[[modules/B]]` and add a reverse note in B.
2. Flow-to-module links: each flow links to participating modules; modules link back under `## 相关流程`.
3. Flow-to-data links: flow pages link to `[[data-models#结构名]]`; data model sections link back to usage flows.
4. Flow-to-implementation links: flow pages link to key implementations; key implementation entries link back.
5. `overview.md` lists core flow links.
6. Check that new pages have at least one incoming link.

## Phase 7: Global Updates

Update:

- `index.md`
- `global/dependency-graph.md`
- `global/system-architecture.md`
- `global/tech-stack.md`
- `global/data-flow.md`, if cross-repo request/data flow is evident
- `global/shared-patterns.md`, if common patterns are evident
- `global/cross-repo-concerns.md`, if shared protocols or contracts are evident
- `log.md`

Do not generate `indexes/` Markdown pages during ingest. Query-time lookup should
use page frontmatter, wikilinks, `sources`, helper-built transient indexes, or
source search instead of maintaining separate thin index notes.

## Phase 8: Deep Analysis Candidate Confirmation

At the end of ingest, produce a confirmation table of every key business flow that should be considered for `obsidian-kb-deep-analysis`.

The table must include flows generated during this ingest and important candidate flows discovered but not deeply expanded.

Use this shape:

```markdown
## Deep Analysis 候选流程确认表

| 序号 | 流程名称 | 入口/接口 | 触发方式 | 涉及仓库/模块 | 是否跨消息边界 | 风险等级 | 推荐原因 | 建议分析 |
|---|---|---|---|---|---|---|---|---|
| 1 | {流程名称} | `{文件路径}:{函数或接口}` | HTTP/RPC/MQ/TLV/job/CLI | {repo/module} | 是/否 | high/medium/low | {代码证据和业务原因} | 是/否 |
```

After the table, ask the user whether to run deep analysis for the suggested rows.

Do not start deep analysis automatically during ingest. Wait for user confirmation. If the user confirms, `using-obsidian` must orchestrate the confirmed rows one by one with `obsidian-kb-deep-analysis`.

The preferred execution model after confirmation is sub-agent orchestration: the main agent creates a dedicated sub-agent for each confirmed flow, and each sub-agent performs exactly one `obsidian-kb-deep-analysis` task.

Only fall back to main-agent execution when sub-agents are unavailable in the current environment.

When multiple rows are confirmed, deep analysis must be serial. This is a hard requirement:

1. Create exactly one deep-analysis sub-agent for the first confirmed row.
2. Give the sub-agent only one flow, its entry/interface evidence, related repositories, `{kb-root}`, and the instruction to use `obsidian-kb-deep-analysis` with `obsidian-kb-authoring`.
3. Wait for that sub-agent to finish, write its notes, and return a summary.
4. Review the result for failed writes, missing evidence, or low-confidence gaps.
5. Only then create the next sub-agent for the next confirmed row.

Do not create sub-agents for later rows before the current sub-agent has fully completed. Do not batch-create sub-agents. Do not use parallel tool calls or parallel orchestration for confirmed deep-analysis rows.

If sub-agents are unavailable:

1. Run the first confirmed row in the main agent.
2. Wait for that analysis to finish and write its notes.
3. Review the result for failed writes, missing evidence, or low-confidence gaps.
4. Only then start the next confirmed row.

Do not start multiple deep-analysis sub-agents or main-agent deep-analysis tasks in parallel. Deep analysis updates shared knowledge pages, so parallel execution can create conflicting edits and inconsistent links.

## Quality Bar

- Do not overfit to README claims when code says otherwise.
- Do not stop business-flow discovery at the depth-2 terrain scan.
- Do not ignore message, protocol, event, or topic boundaries; record them as deep-analysis candidates when they indicate downstream processing.
- Mark low confidence when entry points or dependencies are unclear.
- Keep first ingest idempotent: rerunning on unchanged source should produce equivalent notes.
- Preserve existing human edits by merging instead of overwriting.
