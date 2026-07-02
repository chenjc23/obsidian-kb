# candidate-flows — 流程发现与排序(全量清单)

产出:`repos/{repo}/candidate-flow.md`(先 `scaffold candidate-flow --repo {repo}` 拿骨架文本,填好后 Write 到打印路径)。

发现先于深挖:先尽可能枚举所有识别到的流程,再排深度分析顺序。大仓召回不足通常来自过早收敛,入口枚举、证据链确认、同质分支归并都完成后再收尾。

1. 按需读流程发现参考,只读相关一份:C/C++ 子系统读 `references/c-cpp-flow-discovery.md`;非 C/C++ 读 `references/general-flow-discovery.md`。不要两份都读进上下文。
2. 枚举入口、确认三段证据链、判断可达性、过滤常量族噪声、合并同质分支,排出分析顺序。
3. 所有识别到的流程写进同一张 `candidate-flow.md`,初始状态 `待深挖`;分析顺序只决定 deep-dive 的执行先后。
4. 不生成单文件浅流程页。一个 flow 只有两种状态:登记在清单、或已深挖后翻 `已深挖`。
