---
name: using-obsidian
description: Use when working with a multi-repository Obsidian code knowledge base, including requirements context, solution design context, repo ingest, knowledge updates, read-only agent query, linting, or deep analysis. This is the routing skill for the obsidian-kb-* suite.
---

# Using Obsidian Multi-Repository Code Knowledge Skills

Use this as the entry point for the Obsidian/code-kb skill suite.

The suite builds and operates a multi-repository knowledge base. The primary consumer is an agent that needs business, architecture, flow, contract, module, dependency, and risk context while doing software work.

## Default Paths

Default knowledge base root:

```text
{current working directory}/code-kb
```

Use a user-provided path only when the user explicitly specifies one.

The user does not need to provide the knowledge base path for normal knowledge-base work.

Apply automatic discovery for any request that asks to read, query, analyze, inspect, explain, design from, debug with, review with, update, lint, or assess impact through the knowledge base.

When no path is provided, discover `{kb-root}` automatically in this order:

1. If the current working directory is itself a knowledge base, use it.
2. If `{current working directory}/code-kb` exists, use it.
3. Walk upward from the current working directory and use the nearest ancestor `code-kb/`.
4. Search immediate workspace children for a directory named `code-kb/`.
5. If multiple candidates exist, choose the one with the strongest multi-repo structure: `index.md`, `global/`, `repos/`, and `log.md`.
6. If ambiguity remains, choose `{current working directory}/code-kb`.

Do not ask the user where the knowledge base is or where it should be created unless the user explicitly asks to choose between candidates.

A directory is a likely knowledge base when it contains several of:

- `index.md`
- `global/`
- `repos/`
- `log.md`
- pages with `type`, `scope`, `repo`, `sources`, `confidence`, and `status` properties

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

When path behavior is uncertain, use the bundled helper:

```bash
node {using-obsidian-skill-root}/scripts/obsidian-kb.mjs resolve --json
```

If the helper only resolves the default path and that path does not exist, perform the automatic discovery steps above manually before asking the user.

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
3. Ask the user to confirm any `obsidian-kb-ingest` deep-analysis candidate table before running deep analysis.
4. `obsidian-kb-deep-analysis` for confirmed focused flow analysis.
5. `obsidian-kb-lint` to verify the final knowledge base.

## Query Is Read-Only

`obsidian-kb-query` is a read-only context retrieval protocol.

It may read knowledge base pages, transient helper indexes, link graphs, and source files for verification. It must not run `ingest`, `update`, or `deep-analysis` by default.

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
5. Before debugging business or cross-module flows.
6. Before code review.
7. Before test design.
8. Before documentation or knowledge base maintenance.

## Deep Analysis Candidate Orchestration

When `obsidian-kb-ingest` finishes with a `Deep Analysis 候选流程确认表`, do not start deep analysis automatically.

Ask the user whether to analyze the suggested rows. The user may approve all rows, approve selected rows, reorder rows, or decline.

If the user approves multiple rows and sub-agents are available, the main agent must orchestrate them serially:

1. Create exactly one sub-agent for the first confirmed flow.
2. Give that sub-agent only one flow, its entry/interface evidence, the relevant repository roots, `{kb-root}`, and the instruction to use `obsidian-kb-deep-analysis` plus `obsidian-kb-authoring`.
3. Wait until that sub-agent finishes, writes its notes, and returns a summary.
4. Review the result for obvious missing files, low-confidence gaps, or failed writes.
5. Only then create the next sub-agent for the next confirmed flow.

Do not create multiple deep-analysis sub-agents in parallel. Do not batch-create sub-agents. Do not create the next sub-agent until the previous sub-agent has fully completed and returned its result. Cross-flow parallelism is forbidden because deep analyses update shared pages such as `data-models.md`, `overview.md`, `global/data-flow.md`, `global/risk-map.md`, and `log.md`.

If sub-agents are unavailable, the main agent must run the confirmed flows one by one in the same serial order.

After all confirmed deep analyses finish:

- Run or recommend `obsidian-kb-lint`.
- Summarize completed flows, generated pages, cross-boundary messages, evidence confidence, and remaining gaps.

## Shared Authoring Rules

For any task that writes or edits notes, apply `obsidian-kb-authoring`.

Preserve these invariants:

- Follow `obsidian-markdown` for Obsidian syntax.
- Follow `obsidian-kb-authoring` for multi-repository knowledge engineering rules.
- Write knowledge content in Chinese by default.
- Keep code identifiers, file paths, library names, API names, protocol names, and technical terms in original spelling.
- Every generated page has Obsidian properties with `title`, `type`, `scope`, `repo`, `created`, `updated`, `sources`, `confidence`, and `status`.
- Do not invent code details. If evidence is incomplete, mark `confidence: low` and explain what is missing.
- Maintain bidirectional wikilinks for meaningful domain, flow, contract, module, risk, and source relationships.
- Avoid orphan pages.
- Record meaningful ingest, update, deep-analysis, and repair operations in `log.md`.
- For communication-domain flows, continue through message, protocol, event, RPC, MQ, socket, and TLV boundaries when evidence exists in the workspace.

## Work Pattern

1. Resolve `{kb-root}` and source repository roots.
2. Route to the execution skill.
3. Read the smallest useful set of helper search results, notes, and sources.
4. Write or update notes only when the user requested a write-oriented task.
5. Run or recommend bundled helper `lint` after write-oriented tasks.
6. Summarize changed files, evidence, confidence, and remaining uncertainty.

## Do Not

- Do not treat query as permission to write.
- Do not skip `sources`.
- Do not use line numbers in durable wiki references; use `path:functionName()` or `path:className.methodName()` instead.
- Do not generate single-repo top-level folders; use `repos/{repo-name}/`.
- Do not use placeholders such as "similar logic", "same as above", or "omitted" to skip code paths in deep analysis.
