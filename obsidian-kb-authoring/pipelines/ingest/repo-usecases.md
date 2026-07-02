# repo-usecases — 仓内行为场景

按 `repos/{repo}/candidate-flow.md` 里的流程清单,归并本仓可独立理解的行为场景。每个合格场景生成一个 `repos/{repo}/usecases/{title}.md`。

1. 先读 `candidate-flow.md` 与已生成的 `overview.md` / `architecture.md`,只围绕已识别流程做场景归并。
2. 合格场景 = 有明确触发者/入口、目标结果、可串起一个或多个 flow/submodule/contract。单个底层函数、纯工具方法、同质分支不单独建页。
3. 对每个合格场景运行 `scaffold repo-usecase --repo {repo} --title {场景名}`,填好后 Write 到打印路径。正文必须链到对应 `flows/`、`submodules/`、`api-surface`/`api-depend` 或 `global/contracts/`。
4. 没有合格场景时不要硬造空页;在 `coverage.md` 追加一条本仓用例视图判断(例如“未发现可独立成页的仓内行为场景”),再 `pipeline done repo-usecases --repo {repo}`。
5. 完成后执行 `pipeline done repo-usecases --repo {repo}`。本 stage 允许零产物,靠自报完成。
