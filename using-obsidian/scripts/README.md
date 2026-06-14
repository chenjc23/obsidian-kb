# Obsidian KB Helper

`obsidian-kb.mjs` is a zero-dependency Node.js helper bundled inside the `using-obsidian` skill.

It performs deterministic operations that are safer and more repeatable in code than in skill prose:

- Resolve default paths.
- Initialize `code-kb/`.
- Build indexes.
- Lint properties and links.
- Inspect incoming and outgoing links.
- Report knowledge base health.

## Commands

From this repository:

```bash
node skills/using-obsidian/scripts/obsidian-kb.mjs resolve --json
node skills/using-obsidian/scripts/obsidian-kb.mjs init
node skills/using-obsidian/scripts/obsidian-kb.mjs index
node skills/using-obsidian/scripts/obsidian-kb.mjs lint
node skills/using-obsidian/scripts/obsidian-kb.mjs links contracts/AllocateResource.md --json
node skills/using-obsidian/scripts/obsidian-kb.mjs report --json
```

After installing or copying the skills, locate the `using-obsidian` skill root and run:

```bash
node {using-obsidian-skill-root}/scripts/obsidian-kb.mjs report --json
```

The helper is optional for read-only query tasks. If an agent cannot locate it, it should scan Markdown files and wikilinks manually.
