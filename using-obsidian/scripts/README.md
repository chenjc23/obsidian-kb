# Obsidian KB Helper

`obsidian-kb.mjs` is a zero-dependency Node.js helper bundled inside the `using-obsidian` skill.

It performs deterministic operations that are safer and more repeatable in code than in skill prose:

- Resolve default paths.
- Initialize `code-kb/`.
- Build transient in-memory indexes for commands that need page metadata or links.
- Search durable notes by title, aliases, frontmatter, wikilinks, sources, and body text.
- Lint properties and links.
- Inspect incoming and outgoing links.
- Report knowledge base health.
- Scaffold pages from templates (`scaffold`, `types`).
- Print registry-derived structure views on demand (`describe`).

## 结构单一来源

页型的结构事实（落点路径 / 视图透镜 / lint 连接规则 / 通用 schema 与枚举）唯一来源是 `obsidian-kb-authoring/registry.yaml`，由 `lib/registry.mjs` 读取，`template`/`lint`/`index-build`/`init` 全部从中派生。页面正文 `## section` 结构仍以各 `templates/{type}.template.md` 为准。

**参考文档不囤生成副本**：需要可读的派生视图（type 枚举 / type→视图 / 页型形状含必需 section / 目录树）时，运行 `obsidian-kb.mjs describe [types|views|shapes|tree] [--json]` 按需打印。改结构改注册表（或模板）即可，无需回头同步文档。

## Commands

From this repository:

```bash
node skills/using-obsidian/scripts/obsidian-kb.mjs resolve --json
node skills/using-obsidian/scripts/obsidian-kb.mjs init
node skills/using-obsidian/scripts/obsidian-kb.mjs lint
node skills/using-obsidian/scripts/obsidian-kb.mjs links global/contracts/AllocateResource.md --json
node skills/using-obsidian/scripts/obsidian-kb.mjs search "业务开通" --json
node skills/using-obsidian/scripts/obsidian-kb.mjs report --json
node skills/using-obsidian/scripts/obsidian-kb.mjs types --json
node skills/using-obsidian/scripts/obsidian-kb.mjs describe
node skills/using-obsidian/scripts/obsidian-kb.mjs describe tree
node skills/using-obsidian/scripts/obsidian-kb.mjs describe views --json
```

After installing or copying the skills, locate the `using-obsidian` skill root and run:

```bash
node {using-obsidian-skill-root}/scripts/obsidian-kb.mjs report --json
```

The helper is optional for read-only query tasks. If an agent cannot locate it, it should scan Markdown files and wikilinks manually.
