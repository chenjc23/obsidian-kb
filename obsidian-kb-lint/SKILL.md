---
name: obsidian-kb-lint
description: "Use to inspect an Obsidian code knowledge base for health issues: missing required pages, orphan notes, stale sources, broken or missing wikilinks, inconsistent claims, weak coverage, or malformed frontmatter. Triggers on 'lint kb', 'health check', '检查知识库', 'find orphan pages', 'stale docs', or 'verify code-kb'."
---

# Obsidian KB Lint

Use this to audit a knowledge base and produce actionable fixes. Combine with `obsidian-kb-authoring` if applying fixes.

## Checks

### 1. Structure Completeness

For each repo folder, check required pages:

- `overview.md`
- `architecture.md`
- `glossary.md`
- `modules/` with at least one module page
- `flows/` with at least one repo-local flow page when the repo has business flows
- `api-surface.md`
- `data-models.md`
- `config-and-env.md`
- `error-handling.md`
- `testing-strategy.md`
- `key-implementations.md`
- `gotchas.md`

Missing optional-looking pages may still be acceptable if the repo truly lacks that concern. Mark as warning, not fatal, when justified.

### 2. Frontmatter Validity

Check every page for:

- Required fields.
- Valid `type`.
- Non-empty `sources`.
- Valid `confidence`.
- Current and plausible dates.

### 3. Orphan Pages

Find pages with no incoming wikilinks. Exclude top-level roots like `index.md` only if they are intentionally entry points.

### 4. Source Staleness

For each `sources` entry:

- Check whether the source file exists.
- Compare source modified time or Git change status when available.
- Flag pages whose sources changed after the page `updated` date.

### 5. Consistency

Look for contradictions:

- Two modules claiming the same exclusive responsibility.
- Flow pages naming a module that no module page describes.
- `overview.md` dependency claims that conflict with `global/dependency-graph.md`.
- API pages that conflict with route/proto definitions.

### 6. Coverage

Identify important source directories not mentioned by any wiki page:

- Entry points.
- Controllers/routes.
- Services/domain modules.
- Models/schemas.
- Config and infrastructure.
- Tests.

## Report Format

Use this structure:

```markdown
# 知识库健康检查

## 总结
- 状态：通过 / 有警告 / 需要修复
- 仓库数：N
- 页面数：N
- 主要风险：{one sentence}

## 问题列表
| 严重级别 | 类型 | 位置 | 问题 | 建议动作 |
|---|---|---|---|---|

## 孤立页面
{or "无"}

## 陈旧页面
{or "无"}

## 覆盖缺口
{or "无"}

## 建议修复顺序
1. {highest impact fix}
```

## Applying Fixes

Only edit files when the user asks for fixes, or when the current request clearly includes fixing. When fixing:

- Preserve human edits.
- Prefer adding missing links and metadata over rewriting pages.
- Record fixes in `log.md` if they materially change the knowledge base.
