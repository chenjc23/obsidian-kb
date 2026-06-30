# C/C++ 流程发现参考

本文件用于 `obsidian-kb-ingest` 的 Phase 3。C/C++ 仓库的流程入口常被宏、注册表、函数指针表、虚分发、回调、事件循环和构建条件隐藏；流程发现必须先证明“这条路径可被运行时触发”，再进入全量清单。

## 先判可达性

先看构建系统，避免把死代码、测试工具或未启用平台实现当成业务流程：

- 优先读取 `compile_commands.json`、`CMakeLists.txt`、Bazel `BUILD`、`Makefile`、`*.cmake`、`conanfile.*`、`vcpkg.json`。
- 记录目标名、源码文件是否参与编译、链接到哪个 binary/library、是否受 `#ifdef`、平台宏、feature flag 或 CMake option 控制。
- `generated/` 不做大体量深读，但要读取协议标识、service 接口、message/enum 定义、IDL 生成入口和自动生成的 dispatch 元数据。
- 找不到构建可达性证据时，流程仍可登记，但 `confidence: low`，并在“证据链”里标明缺口。

## C/C++ 入口地图

按下面类别搜索入口：

| 类别 | 典型信号 | 命中后确认什么 |
|---|---|---|
| 进程入口与装配 | `main(`、`init`、`Init`、`start`、`Start`、`run`、`Run`、`Service::Start`、`Application`、`Daemon` | 哪些模块被装配、哪些线程/loop/timer/server 被启动 |
| 宏注册 | `REGISTER`、`DECLARE`、`DEFINE`、`*_REGISTRY`、`*_HANDLER`、`PLUGIN`、`FACTORY` | 宏展开或调用点绑定到哪个函数/类 |
| 注册表/分发表 | C 数组表、结构体表、函数指针表、`map`、`unordered_map`、`array`、`std::function`、`bind`、`emplace`、`insert` | key 是什么，value 指向哪个 handler，分发点在哪里 |
| 协议分发 | `switch`、`case`、`enum class`、`#define`、`opcode`、`cmd`、`msg_id`、`type`、`TLV` | 每个分支是否引向独立业务行为 |
| C++ 虚分发 | `virtual`、`override`、基类接口、策略类、工厂创建、插件派生类 | 实际派生类实现如何被创建和调用 |
| C 风格回调 | callback 字段、函数指针参数、`*_cb`、`*_ops`、`*_vtable`、`handler(void*)` | 谁注册回调，谁触发回调，回调内副作用是什么 |
| 异步回调 | `std::function`、lambda、`callback`、`OnXxx`、`HandleXxx`、`Notify`、`Subscribe` | 谁注册回调，谁触发回调，回调内副作用是什么 |
| 网络/事件循环 | `boost::asio`、`async_`、`read`、`write`、`recv`、`send`、`accept`、`poll`、`epoll`、`select`、`timerfd`、`eventfd`、`libevent`、`libuv` | 收包/定时/连接事件如何进入业务 handler |
| RPC/IDL | gRPC service override、thrift/proto service、OpenAPI bridge | service 方法、请求/响应类型、实现类、注册到 server 的位置 |
| 线程/任务 | `pthread_create`、`std::thread`、thread pool、queue、worker、job、task executor | 入队点、出队消费点、worker 主循环、停止条件 |
| 状态机 | `state`、`transition`、`fsm`、状态枚举、状态表 | 状态迁移是否触发不同业务行为 |

## 三段证据链

每条流程进入 `candidate-flow.md` 前，尽量给出三段证据：

1. **注册/绑定证据**：route/topic/message ID/宏/表项/override/工厂/回调注册在哪里。
2. **运行时分发证据**：消息、事件、状态、线程或 loop 如何根据 key 走到该绑定。
3. **业务实现证据**：最终 handler/service/function 做了什么外部副作用或状态变化。

三段都齐全通常 `confidence: high`；缺一段但命名和邻近代码强相关通常 `medium`；只找到常量、声明或孤立 handler 则 `low`。

## 常量族过滤

不是每个 enum、宏或 `case` 都是一条流程。只有满足至少一条才登记为流程：

- 分支绑定到独立 handler、状态迁移、RPC/MQ/socket/event 发送接收、DB/文件/外部系统副作用。
- 分支改变业务对象生命周期或关键状态。
- 分支有独立错误处理、重试、回滚、补偿或 ACK/NACK 行为。

只表示错误码、日志级别、配置位、纯数据字段、无业务分叉的状态值，不单独登记流程；可作为数据模型、constraints、specifications 或契约字段记录。

## 去重与合并

- 同一 message ID 在多处出现时，以“最终业务 handler”为流程锚点，注册点和分发点作为证据链。
- 同质分支臂合并为一条流程，并列出覆盖的 key 列表。
- 同一流程跨同步函数、异步回调和下游消息时，只登记一条端到端流程；不要把每个函数调用拆成流程。
- 测试入口、mock、benchmark、demo 工具默认不进入业务流程清单，除非用户明确要求分析测试流程。

## 排序

按这些因素排出深度分析顺序：

- 构建与运行可达性清晰度。
- 外部接口、协议入口或消息入口暴露程度。
- 宏注册、函数指针表、虚分发、回调链的复杂度。
- 跨线程、跨事件循环、跨 socket/RPC/MQ/TLV 边界的长度。
- 状态迁移、错误处理、重试、回滚、补偿或 ACK/NACK 风险。
- 业务状态或外部副作用的重要性。
- 证据链完整度和命名清晰度。

排序值使用连续数字（1、2、3...）。排序只决定执行先后，清单中的每条流程都要深挖。

## 写入流程清单

`candidate-flow.md` 的表结构以 `obsidian-kb-authoring/templates/candidate-flow.template.md` 为唯一来源。本参考只补充 C/C++ 语义要求：

- 证据链按 `注册/分发/实现` 简写，缺口写清楚。
- 可达性写构建或运行证据，如 `target:xxx`、`ifdef:FEATURE_X`、`generated IDL`、或 `unknown`。
- `confidence` 由三段证据链和构建可达性共同决定。
