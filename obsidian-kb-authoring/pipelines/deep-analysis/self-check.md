# self-check — 自查补漏与链接

产出:`repos/{repo}/flows/{topic}/自查报告.md`。deep-analysis 的完成门槛。

逐条检查:
- 调用树每个函数都覆盖;每条分支覆盖(默认/else/错误/边界),关键分支完整分析或以证据列为低置信缺口。
- 独立成文件的分支页与 `主干流程.md`/`调用树.md` 双链闭环,嵌套分支父子双向。
- 每个消息/协议/事件/topic/socket/RPC/TLV 边界有已追踪的接收方/调用方,或显式低置信缺口。
- 数据流从输入到输出连续;payload 字段在有代码证据时从生产源追到接收消费,发送/接收两侧逻辑都分析。
- 提升到 `global/domains/`、`global/use-cases/`、`global/contracts/`、`data-models.md` 的都加了反向链;任何 `status: partial` 契约都在 coverage 待接合边表有记录。
- 每条正文 wikilink 指向存在的 KB 页;指向源码文件或不存在的页即非法,改成 `sources`/inline 引用或正确页链接。

append `log.md`:分析主题、入口、生成文件、覆盖的跨边界、提升的域/用例/契约/结构、剩余低置信区域。
