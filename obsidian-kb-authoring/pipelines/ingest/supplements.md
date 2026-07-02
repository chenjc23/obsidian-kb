# supplements — 补充页(有内容才生成)

按适用性产出下列页(先 `scaffold {type}` 拿骨架文本,填好后 Write 到打印路径);本仓不适用的类型直接跳过,全部处理完后 `pipeline done supplements --repo {repo}`。

- `glossary.md`:每个术语必须是代码标识符/注释/README/文档里真实出现的词或缩写,带出处;不编造,缩写无确证不臆测扩写。
- `api-surface.md`:路由、proto、OpenAPI、controller、消息契约(本仓对外接口面)。
- `api-depend.md`:本仓依赖的外部接口、协议、消息、超时/重试/失败影响。
- `data-models.md`:ORM 模型、schema、proto/types、状态结构。
- `specifications.md`:规格、配置加载、env、feature flag、编译宏。
- `constraints.md`:设计原则、硬约束、错误处理、重试/降级、隐式约定与已知陷阱。
- `resource-analysis.md`:CPU/内存/IO/连接/线程/队列等资源占用、容量与退化策略。
- `human-interfaces.md`:CLI、MIB、SNMP 等人机接口。

一页一主题,页型用途见 `describe shapes`,不在此复述。
