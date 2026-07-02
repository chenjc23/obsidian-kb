# coverage — 覆盖记录(只追加)

产出/追加:`global/architecture/coverage.md`(不存在则 `scaffold coverage` 拿骨架文本、填好后 Write;已存在则直接追加)。本 stage 闸门为 `exists + noPlaceholder`,追加真实覆盖行时须清掉骨架里的 `<!-- 填 -->` 占位,否则判未完成。

append 三类,不回改旧行:
- 本仓覆盖度行(深度 = `只地形扫描` / `子模块已解析` / `流程已深挖`)。
- 本次发现的待接合边(指向未 ingest 仓的调用、单边 partial 契约——partial 契约已由 `scaffold contract --partial` 自动记录,其余手动追加)。
- 已知盲区。

接上某端时才把对应行翻 `已接合`。coverage 的机制与语义见 `references/directory-contract.md`,不在此复述。

本轮 ingest 收尾还需 append `log.md`:记这轮扫了哪些仓、生成/更新了哪些页(只追加流水)。
