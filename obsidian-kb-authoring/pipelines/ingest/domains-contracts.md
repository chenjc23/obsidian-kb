# domains-contracts — 业务域与契约提取(只新增页)

修复孤儿视图,发现新的加一页,不回改已有页叙事。处理完后 `pipeline done domains-contracts --repo {repo}`。

1. 逻辑视图 → `global/domains/{业务域}.md`:从 glossary、overview/submodule 职责、README 领域语言聚类业务域,定义概念、不变量、状态、相邻域,链向实现该域的流程。
2. 契约视图 → `global/contracts/{契约名}.md`:把跨边界契约(HTTP/RPC、MQ topic、event、协议消息、TLV/frame)提升为独立契约页,记消息标识、payload schema、producer/consumer、接收方发现证据。建页用 `scaffold contract`。
   - 只找到一端时用 `scaffold contract --partial --side {producer|consumer} --known {repo} --evidence {证据}`:它建 partial 页并自动在 coverage 待接合边表记录,未知端留空,不编造假对端。
3. 深度端到端字段映射留给 deep-analysis,这里只提升定义。
