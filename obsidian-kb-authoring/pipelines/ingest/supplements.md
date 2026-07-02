# supplements — 补充页(8 类全部必生成)

下列 8 页**全部必须生成**(先 `scaffold {type}` 拿骨架文本,填好后 Write 到打印路径)。适用的照实写;本仓不适用的类型**也要生成**,frontmatter 标 `confidence: low`,正文一句写明「本仓无此类 / 未发现出处」,不静默跳过。8 页齐备即本 stage 完成(exists 闸门自动判定,无需手动 `pipeline done`)。

- `glossary.md`:每个术语必须是代码标识符/注释/README/文档里真实出现的词或缩写,带出处;不编造,缩写无确证不臆测扩写。
- `api-surface.md`:路由、proto、OpenAPI、controller、消息契约(本仓对外接口面)。
- `api-depend.md`:本仓依赖的外部接口、协议、消息、超时/重试/失败影响。
- `data-models.md`(scaffold 页型名 `data-model`):ORM 模型、schema、proto/types、状态结构。
- `specifications.md`:规格、配置加载、env、feature flag、编译宏。
- `constraints.md`:设计原则、硬约束、错误处理、重试/降级、隐式约定与已知陷阱。
- `resource-analysis.md`:CPU/内存/IO/连接/线程/队列等资源占用、容量与退化策略。
- `human-interfaces.md`:CLI、MIB、SNMP 等人机接口。

一页一主题,页型用途见 `describe shapes`,不在此复述。
