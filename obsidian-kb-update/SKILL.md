---
name: obsidian-kb-update
description: Use when existing Obsidian code knowledge-base notes need to be updated after source code changes, changed requirements, or stale documentation. Triggers on "update the kb", "refresh affected wiki pages", "sync docs with code changes", "增量更新知识库", or requests involving changed files and existing code-kb pages.
---

# Obsidian KB Update

Use this for incremental updates. The goal is to change only the pages affected by source or knowledge changes.

Always combine with `obsidian-kb-authoring` when writing notes.

## Update Workflow

1. Identify the changed source files.
   - Prefer Git diff/status if available.
   - If the user provides file names or a patch, use that as the change set.
2. Map changed files to existing wiki pages.
   - Search `sources` frontmatter.
   - Search page bodies for code references.
   - Use `index.md` and repo `overview.md` to locate affected areas.
3. Re-read changed source files and nearby context.
4. Update only impacted pages.
5. Check whether the change creates cross-repo impact.
6. Refresh `updated`, `sources`, and `confidence`.
7. Maintain or repair bidirectional links.
8. Append a concise record to `log.md`.

## Impact Mapping

Use this mapping:

- Route/controller/proto changes → `api-surface.md`, related `flows/`, related modules.
- TLV/protocol/message-code/command-code changes → related `contracts/`, `api-surface.md`, `data-models.md`, related deep flow folders, `跨边界数据流.md`, and `global/data-flow.md`.
- MQ topic/producer/consumer changes → related `contracts/`, producer and consumer modules, related `flows/`, related deep flow folders, `跨边界数据流.md`, and `global/data-flow.md`.
- Socket/frame/parser/encoder/decoder changes → related `contracts/`, `data-models.md`, related deep flow folders, `跨边界数据流.md`, `error-handling.md`, and `global/data-flow.md`.
- Event emit/listen/subscriber changes → related `contracts/`, producer and consumer modules, related `flows/`, related deep flow folders, `跨边界数据流.md`, and `global/data-flow.md`.
- Handler registry/dispatch table changes → `api-surface.md`, related `contracts/`, affected flow pages, related deep flow folders, `跨边界数据流.md`, and `global/cross-repo-concerns.md`.
- RPC client/server/interface changes → `contracts/`, `api-surface.md`, producer and consumer modules, related `flows/`, related deep flow folders, `跨边界数据流.md`, and `global/data-flow.md`.
- Type/model/schema changes → `data-models.md`, related flows and modules.
- Config/env changes → `config-and-env.md`, related flows.
- Error/retry/fallback changes → `error-handling.md`, related flows and gotchas.
- Algorithm/core service changes → `key-implementations.md`, related modules and flows.
- Test/CI changes → `testing-strategy.md`.
- Module boundary/export/import changes → module pages and `architecture.md`.

For communication-domain changes, do not update only the local sender or receiver page. Trace both sides when code evidence exists in the workspace:

1. Identify the changed message, protocol field, topic, operation code, command ID, route, or handler registration.
2. Find producer-side construction or send logic.
3. Find consumer-side decode, dispatch, handler, state mutation, response, retry, or compensation logic.
4. Update every affected knowledge page that claims the old cross-boundary data flow.
5. If downstream code cannot be found, mark the affected flow or contract `confidence: low` and record the missing evidence.

## Merge Discipline

- Preserve manual prose unless it is clearly stale.
- Prefer targeted edits to full-page rewrites.
- When new code contradicts existing notes, update the note and mention the changed behavior.
- If evidence is incomplete, downgrade confidence instead of guessing.

## Required Final Checks

- Affected pages have current `updated` dates.
- `sources` includes the changed files that support the updated claims.
- Links remain valid and relevant.
- Existing pages referenced by new links have reverse links where practical.
- `log.md` records what changed and why.
