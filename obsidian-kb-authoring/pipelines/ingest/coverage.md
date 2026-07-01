# coverage — 覆盖记录(只追加)

产出/追加:`global/architecture/coverage.md`(不存在则 `scaffold coverage`)。

append 三类,不回改旧行:
- 本仓覆盖度行(深度 = `只地形扫描` / `子模块已解析` / `流程已深挖`)。
- 本次发现的待接合边(指向未 ingest 仓的调用、单边 partial 契约——partial 契约已由 `scaffold contract --partial` 自动记录,其余手动追加)。
- 已知盲区。

接上某端时才把对应行翻 `已接合`。coverage 的机制与语义见 `references/directory-contract.md`,不在此复述。
