# data-structures — 数据结构提升与视图接线

产出:`repos/{repo}/flows/{topic}/数据结构.md`(适用则先 `scaffold flow --repo {repo} --topic {主题} --member 数据结构` 拿本件骨架填好再 Write;不适用则在 `自查报告.md` 写明)。处理完后 `pipeline done data-structures --repo {repo} --pipeline deep-analysis`。

把深挖中浮现的可复用知识提升到正确视图层:

1. 数据结构:完整字段定义提升/同步到 `repos/{repo}/data-models.md`(加反向链)。本文件不重抄完整定义,只持有本流程的:生命周期(谁构造→传递→消费→销毁)、被读/改的字段及含义、继承/组合/嵌套关系。
2. 业务域:识别真实业务域,`global/domains/{域}.md` 不存在则 `scaffold domain` 拿骨架文本填好后 Write 新建;已存在只追加最小反向链与新证据。
3. 用例视图:本流程若是跨模块/跨仓端到端场景或编排多 flow/contract,新增或接线 `global/use-cases/{用例}.md`;单仓技术流程不强行建用例页。
4. 双链闭环:flow↔domain、flow↔use-case、flow↔contract、flow↔data-model 双向可达。证据不足不新建正式页,在 `自查报告.md` 记候选与 `confidence: low` 原因。
