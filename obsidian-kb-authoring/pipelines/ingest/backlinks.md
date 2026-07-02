# backlinks — 双向链接

把本轮新页接进关系图,处理完后 `pipeline done backlinks --repo {repo}`。规则以 `references/link-contract.md` 为准。

1. 子模块↔子模块:A 依赖 B 则 A 链 `[[repos/{repo}/submodules/B/overview]]`,B 反向链回。
2. 流程↔子模块、流程↔契约、流程↔数据、域↔流程:全部双向。
3. `architecture.md` 列出核心流程与 overview/submodule 链接。
4. 检查每个新页至少一条入链。
