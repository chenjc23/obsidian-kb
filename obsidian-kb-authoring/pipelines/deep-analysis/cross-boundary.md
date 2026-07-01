# cross-boundary — 跨消息边界与端到端数据流(契约提升)

产出:`repos/{repo}/flows/{topic}/跨边界数据流.md`(不适用则在 `自查报告.md` 写明原因)。处理完后 `pipeline done cross-boundary --repo {repo} --pipeline deep-analysis`。

遇 TLV、协议帧、消息收发、socket、MQ、RPC、event、topic/handler dispatch、callback 等边界,跨整个 workspace 追到下游接收方或上游调用方,覆盖发送方和接收方完整处理逻辑(不止识别接口/topic/消息 ID)。

契约提升:可复用的契约定义(消息标识、payload schema、字段、producer/consumer、接收方发现证据)提升/同步到 `global/contracts/{契约名}.md`。本文件不重抄 schema,只持有:穿越了哪些边界(各链到 `[[global/contracts/{名}]]`)、本场景发送方业务前置与字段来源、接收方处理结果与副作用、字段映射表、端到端 `mermaid sequenceDiagram`。

对端落在未 ingest 仓 → 提升为 partial 契约并在 coverage 记待接合边;本该有却没搜到 → 相关段 `confidence: low` + 精确搜索证据 + 缺口进 `自查报告.md`。
