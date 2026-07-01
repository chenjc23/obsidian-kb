# submodules — 子模块拆解

产出:`repos/{repo}/submodules/{topic}/` 七件套(先 `scaffold submodule --repo {repo} --topic {主题}`)。

1. 扫核心模块目录,读 index/barrel/export 与公共接口。
2. 分析子模块间 import/include/注册依赖。
3. 每个真实职责边界一个 `submodules/{topic}/` 文件夹;主锚 `上下文`,`状态迁移规则` 无对象状态机则删整文件。不要给每个小文件夹都建页。`{topic}` 默认中文,只留必要英文。
4. 在 frontmatter `depends-on` + 正文双链记录子模块依赖(影响分析的边)。

关系与字段规则见 authoring `references/link-contract.md` 与 `references/frontmatter-schema.md`,不在此复述。
