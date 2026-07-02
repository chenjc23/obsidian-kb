# main-flow — 主干流程分析

产出:`repos/{repo}/flows/{topic}/主干流程.md`(先 `scaffold flow --repo {repo} --topic {主题} --member 主干流程` 拿本件骨架文本,填好后 Write)。以调用树为基线。

1. 沿最常见/默认路径从入口走到最终返回,独立分析路径上每个函数。
2. 每步含:函数签名与路径、入参出参类型、伪代码级逻辑(非一句话)、读写数据结构、状态变更、分支标记 `此处有 N 条分支路径,将在 branches 展开`。
3. 主路径到达消息/协议/RPC/MQ/event/socket/TLV/topic/handler dispatch/callback 等异步边界时,不在发送方停——跨 workspace 追到接收方入口,把接收方主干处理纳入本文件。

找不到接收方/上游不编造:标 `confidence: low`,记录精确搜索证据,缺口加进 `自查报告.md`。禁止捷径:「类似的处理」「同理」「以此类推」「此处省略」「发送消息后结束」或用 `...` 跳过。
