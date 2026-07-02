# Obsidian KB Helper — 代码目录说明

零依赖 Node.js CLI,随 `using-obsidian` skill 分发。

- **入口**:`obsidian-kb.mjs`,子命令实现在 `lib/`,测试为同名 `*.test.mjs`。
- **跑测试**:`node --test`(在本目录下)。
- **命令契约与用法**:见 `using-obsidian/SKILL.md` 的 Helper Commands——本文件不复述命令清单。
- **页型结构 / 落点 / 视图 / schema 的单一来源**:`obsidian-kb-authoring/registry.yaml` + `templates/`,由 `lib/registry.mjs` 读取,`template`/`lint`/`index-build`/`init` 全部派生。改结构改注册表,不在此囤副本。
