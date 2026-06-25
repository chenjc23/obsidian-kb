# `{kb-root}` 解析（单一来源）

**所有 skill 找知识库根 `{kb-root}` 都用这套规则，不各自重声明。** 默认 `{workspace-root}/code-kb`。

不要问用户知识库放哪。按顺序确定性定位：

1. 用户显式给的路径 → 用之。
2. 当前工作目录本身就像知识库根 → 用之。
3. `{当前工作目录}/code-kb` 存在 → 用之。
4. 最近的祖先目录里的 `code-kb/` → 用之。
5. 工作区下一级名为 `code-kb/` 的目录 → 用之。
6. 多个候选时，选结构最像的：含 `index.md`、`log.md`、`repos/`，以及 `global/`（其下 `use-cases/`/`domains/`/`contracts/` 至少之一）。

「知识库根」判据 = 名为 `code-kb/`，或含 `index.md`/`log.md`/`repos/`/`global/` 等若干结构的目录。

全找不到时按读写区分：

- **写入类**（`ingest` / `deep-analysis` / `update` 写入）：按第 3 步在 `{当前工作目录}/code-kb` **新建**。
- **只读类**（`query` / `lint`）：**不臆造路径**；只有完全找不到、或多个候选同样可能时才问用户。

**永不**问 `{kb-root}` 该放哪。
