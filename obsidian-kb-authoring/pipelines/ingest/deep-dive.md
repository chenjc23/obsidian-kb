# deep-dive — 按清单顺序自动深挖

`candidate-flow.md` 是唯一追踪表。按表中 `分析顺序` 串行深挖每条流程,每完成一条把该行 `状态` 翻 `已深挖`;表全绿本 stage 才完成。

对每条流程,用 `obsidian-kb-deep-analysis`(它自己是一条 pipeline):

1. 优先子 agent 编排:主 agent 为每条流程创建唯一一个专职子 agent,只做一个 deep-analysis 任务。
2. 只给它:一个流程、入口/接口证据、相关仓库、`{kb-root}`,及「用 `obsidian-kb-deep-analysis` + `obsidian-kb-authoring`」的指令。
3. 等它写完笔记、返回摘要;检查失败写入、缺失证据、低置信缺口。
4. 然后才创建下一个流程的子 agent。不并行——深挖会改共享页(data-models/architecture/overview/domains/contracts/log 等)。

流程很多也继续串行,除非用户显式打断、限定范围或要求暂停。
