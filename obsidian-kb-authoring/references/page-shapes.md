# 页面形状（Page Shapes）索引

各 `type` 的页面骨架以 `obsidian-kb-authoring/templates/{type}.template.md` 为唯一来源。本文件只是路由索引：要写哪种页，先 `scaffold {type}` 拿骨架（或直接读对应模板），骨架里的 `<!-- 填:… -->` 内联提示承载写作指引。

通用写作规则见 SKILL.md：中文 prose、保留代码标识符原文、结论先行（前三行说清这页为何重要）、一页一主题。所有页面 frontmatter 一律遵循 [frontmatter-schema.md](frontmatter-schema.md)。

## 页型索引

各页型的用途、模板、刚性边界（必需 `## section`）由 `registry.yaml`（用途/模板）+ 各模板正文（`## section`）派生。要写哪种页，直接 `scaffold {type}` 拿骨架即可；需要完整的页型→用途→模板→必需 section 总表时运行：

```bash
node using-obsidian/scripts/obsidian-kb.mjs describe shapes
```

## 几条不在模板里、但要记住的语义约定

- **契约「定义一次」**：契约页持有可复用定义（schema、标识、producer/consumer）；flow 的跨边界页只持有「本场景如何用」并链回契约，不重抄 schema。
- **单边契约（`status: partial`）**：增量时只找到一端就照常建页，已知一端填上、未知一端留空写「对端待 ingest」，`status: partial`，同时在 `coverage.md` 待接合边表记录。对端仓 ingest 后补全 + 双链，`status` 翻回 `active`、记录行翻「已接合」。用 `scaffold contract --partial` 可一条命令原子完成建页 + 记录。
- **coverage 只追加不改写**：接合一条待接合边 = 把该行状态改 `已接合` + 补全关联 partial 契约的对端与双链，是状态翻转，不是重写整页。
- **仓内结构两层写**：`overview.md` 记录仓级模块定义、职责边界和上下文；`submodules/{topic}/` 记录具体子模块设计与约束。不要再建立 `modules/{title}.md`。
- **深流程「定义一次、引用多次」**：`跨边界数据流` 收发两节都必须填；可复用 schema/标识提升到 `global/contracts/`，完整字段定义提升到 `repos/{repo}/data-models`，子模块细节提升到 `repos/{repo}/submodules/{topic}/`，深流程页只留场景特定内容 + 时序/生命周期。
- **system-architecture 是工作区唯一人工叙事总览**（复用 architecture 模板，含跨仓 mermaid 图）；增量早期常常还不存在，缺席是正常的。依赖图/技术栈/数据流/影响面**不物化成页**——由 query 现算。
