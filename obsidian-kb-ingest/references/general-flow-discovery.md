# 通用流程发现参考

本文件用于 `obsidian-kb-ingest` 的 Phase 3，适用于非 C/C++ 仓库或 C/C++ 之外的子系统。目标是在深度分析前形成全量流程清单，并为每条流程留下足够证据。

## 入口与接口信号

从入口起枚举，覆盖地形扫描期间发现的入口和不限层级搜索得到的入口：

| 类别 | 典型信号 | 命中后确认什么 |
|---|---|---|
| HTTP/API | route、controller、handler、middleware、OpenAPI | route/method、请求响应类型、业务 handler |
| RPC/IDL | gRPC、GraphQL、Thrift、proto、service method | service 注册、方法实现、请求响应模型 |
| MQ/Event | topic、queue、producer、consumer、subscriber、event name | producer/consumer、payload、ACK/NACK 或重试 |
| 协议/消息 | message ID、command ID、operation code、TLV、frame、encode/decode | 标识到 handler 的分发路径 |
| Socket/流 | read loop、frame parser、packet router、session handler | 收包入口、解析、分发、响应 |
| CLI/Job | command、cron、worker、task executor、scheduled job | 触发方式、任务入口、失败处理 |
| 状态机/工作流 | state、transition、workflow、orchestrator | 状态迁移、分支条件、终态 |
| 公共服务方法 | service、use-case、application layer、facade | 是否被外部入口或上层编排调用 |

## 判别式常量族

找 enum、常量表、配置表、dispatch map、handler registry，再定位它们被当作分支或分发 key 的消费点。

只有引向独立业务行为的取值才登记为流程。以下情况可作为流程：

- 分支绑定到 handler、状态迁移、RPC/MQ/socket/event 发送接收、DB/文件/外部系统副作用。
- 分支改变业务对象生命周期或关键状态。
- 分支有独立错误处理、重试、回滚、补偿或 ACK/NACK 行为。

错误码、日志级别、配置位、纯数据字段、无业务分叉的状态值不单独登记流程；可写入数据模型、runtime-notes 或契约字段。

## 三段证据链

每条流程进入 `candidate-flow.md` 前，尽量给出三段证据：

1. **注册/绑定证据**：route/topic/message ID/command/cron/handler registry 在哪里。
2. **运行时分发证据**：请求、消息、事件、状态或任务如何走到该 handler。
3. **业务实现证据**：最终 handler/service/orchestrator 做了什么状态变化或外部副作用。

三段都齐全通常 `confidence: high`；缺一段但命名和邻近代码强相关通常 `medium`；只找到声明、常量或孤立 handler 则 `low`。

## 粒度与合并

- 一条流程 = 锚定在某入口/分发臂上、有独立业务行为的执行路径。
- 不把每个函数、每个常量、每个 helper 都登记成流程。
- 同质分支臂合并为一条流程，并在推荐原因或证据链里列出覆盖的 key。
- 同一流程跨同步调用、异步回调和下游消息时，只登记一条端到端流程。
- 测试、mock、demo、benchmark 默认不进入业务流程清单，除非用户要求分析测试流程。

## 完整性自检

登记完成后检查：

- API/RPC/CLI/job/consumer/socket/event 入口是否都扫过。
- message ID、command ID、operation code、状态枚举、handler registry、dispatch map 是否都逐臂检查过。
- 重要入口是否能追到业务实现；不能追到时是否标 `confidence: low` 并说明缺口。
- 跨消息边界是否登记了契约候选，并为 deep-analysis 留出追接收方的证据。

## 排序

按这些因素排出深度分析顺序：

- 业务价值。
- 外部接口暴露。
- 跨模块/跨仓耦合。
- 协议复杂度。
- 逻辑链条/执行链路长度。
- 错误、重试、回滚、补偿风险。
- 命名和证据清晰度。

排序值使用连续数字（1、2、3...）。排序只决定执行先后，清单中的每条流程都要深挖。

## 写入流程清单

`candidate-flow.md` 的表结构以 `obsidian-kb-authoring/templates/candidate-flow.template.md` 为唯一来源。本参考只补充通用语义要求：

- 证据链按 `注册/分发/实现` 简写，缺口写清楚。
- 可达性写触发或注册证据，如 `route active`、`consumer registered`、`cron enabled`、`target:xxx`、或 `unknown`。
- `confidence` 由三段证据链和触发可达性共同决定。
