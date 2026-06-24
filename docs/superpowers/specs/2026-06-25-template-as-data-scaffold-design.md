# 设计：模板即数据 + scaffold 骨干 + 渐进式披露

- 日期：2026-06-25
- 状态：已批准（待落地）
- 范围：obsidian-kb skill 套件的执行健壮性改造

## 问题

套件给参差不齐的 agent 用，两个实践致命问题：

1. **Skill 笨重 → 规则遵守度崩**。agent 做 ingest 时动手前先吞 ~900 行规则（ingest 153 + authoring 60 + 防御性全读 references 687）。每个执行 skill 都写"以 references/ 为准"，agent 不知道这次只写哪种页，于是把 page-shapes.md 一整个 250 行全读进来。context 被规则本身吃掉，埋在散文里的软约定（打 partial / 打 stale / frontmatter 字段）被稀释遗忘。

2. **模板太松 → 产出方差大**。page-shapes.md 是描述性散文（"这页应该长这样"），不是强制性结构（固定 section / 固定字段顺序）。给了 agent 发挥空间，每个 agent 理解不同，产出参差。

**共同病根**：references 按"给人看的宪法/散文"写，不是按"给 agent 填的脚手架"写。

## 已定决策（brainstorm 对齐）

- 脚本（Node）**可靠可跑**，可当骨干；且要求**模块化重写**，告别 560 行单体。
- 模板锁到**"骨架刚性、内容自由"**一档：lint/脚本强制校验骨架，section 内行文留给 agent。
- 采用**方案1：模板即数据 + scaffold 骨干 + 瘦路由**（拿工具确定性 + 靠"模板即数据"避漂移 + 留可读文档兜底）。

## 架构：四层，一个单一来源

```
模板即数据(唯一来源)            脚本(读模板,不硬编码)          文档(瘦成索引/路由)
templates/{type}.template.md ──→ scaffold 命令吐骨架       page-shapes.md 砍成索引表
        │                        lint 派生"必需 section"     authoring SKILL.md 变路由
        └──────────── 三方都从这一份派生,零漂移 ──────────────┘
                                     │
                       收尾闸门 checklist + 原子化工具(partial+coverage 一条命令)
```

## Section 1 · 模板即数据（templates/）

新目录 `obsidian-kb-authoring/templates/`，每种页型一个 `.template.md`。**这是页面结构的唯一来源**，page-shapes.md 不再内嵌骨架。

三种标记，兑现"骨架刚性、内容自由"：

| 标记 | 谁填 | 性质 |
|---|---|---|
| `{{title}}` `{{repo}}` `{{created}}` `{{updated}}` | scaffold 机械填 | 锁死，不靠 agent |
| 固定 `## section 标题`、frontmatter 字段集+顺序 | 模板写死 | 刚性，lint 校验在不在 |
| `<!-- 填:提示 -->` | agent 填 | 自由，行文随意 |

**关键巧思**：page-shapes 里"每个 section 该写啥"的散文指引，搬进模板变成 `<!-- 填:… -->` 内联提示。指引跟着骨架走——scaffold 吐出来时指引就在 agent 眼前，不必另读文档。这是渐进式披露的赢法。

示例 `templates/module.template.md`：

````markdown
---
title: {{title}}
type: module
created: {{created}}
updated: {{updated}}
repo: {{repo}}
sources:
  - <!-- 填:path:func() durable 证据,不带行号 -->
confidence: <!-- 填:high|medium|low -->
status: active
depends-on:
  - <!-- 填:{repo}/{被依赖模块};正文「依赖(出)」须有对应双链 -->
---

# 模块：{{title}}
> <!-- 填:职责一句话 / public entry / 依赖谁、谁依赖它 -->

## 职责
## 公共接口
## 依赖（出）
<!-- 填:[[repos/.../modules/X]],与 depends-on 一致 -->
## 被依赖（入·反向链接）
## 相关流程
````

**模板清单（初版）**：

- 机器要读的页 → 结构强：`contract`（含 `--partial` 变体）、`coverage`、`module`、`candidate-flow`、深流程文件夹 6 件套（调用树 / 主干流程 / 分支主题 / 跨边界数据流 / 数据结构 / 自查报告）。
- 叙事页 → 只锁骨架：`use-case`、`domain`、`architecture` / `system-architecture`、仓内关注点页（`glossary` / `api-surface` / `data-models` / `config` / `runtime-notes` / `key-implementations`）。
- `index` / `log` 已由 init 种；`extra` 给最小模板。

**lint 模板符合度**：必需 section = 模板里的 `## 标题`（标 `<!-- optional -->` 的除外），lint 检查成页还在不在，缺了报 warning。

## Section 2 · 脚本层（模块化 + scaffold）

拆单体为 `scripts/lib/` 小模块，入口只做 dispatch（每文件 100–250 行）：

```
scripts/
  obsidian-kb.mjs        # 瘦入口,import cli
  lib/
    context.mjs          # resolveContext + kb-root 解析(原样搬出)
    frontmatter.mjs      # parseSimpleYaml / 序列化(原样搬出)
    template.mjs         # 新:加载 templates/{type}.template.md、填 {{...}}、解析落点路径
    scaffold.mjs         # 新:new-page 命令(含 --partial 原子挂账)
    init.mjs lint.mjs search.mjs links.mjs report.mjs
    cli.mjs              # 命令分发
```

模板目录定位：脚本按 `import.meta.url` 相对找 `../../obsidian-kb-authoring/templates/`，套件内确定性，不靠 cwd。

**新命令**：

```bash
node obsidian-kb.mjs scaffold module --repo order-service --title 订单编排
node obsidian-kb.mjs scaffold flow --repo order-service --topic 服务开通   # 深流程6件套一次生成
node obsidian-kb.mjs scaffold contract --partial --side producer \
  --title OrderPaid --known order-service --evidence "src/mq/publish.cpp:emitOrderPaid()"
node obsidian-kb.mjs types      # 列可用模板
```

**scaffold 行为约定**：

- type→落点路径由 `template.mjs` 一张小映射表算（`module`→`repos/{repo}/modules/{title}.md`、`contract`→`contracts/{title}.md`、`coverage`→`architecture/coverage.md` …）。映射镜像 directory-contract，注释标明"改目录契约要同步这里"（与 enum 同源纪律一致）。
- 目标已存在 → 拒写并提示（保护人工内容），覆盖要 `--force`。
- `--partial` 时：coverage.md 不存在就先按 coverage 模板建，再 append 悬挂边行；契约页按 `--side` 填一端、另一端留空、`status: partial`。

**lint 扩**：加"模板符合度"，拿页 `type` 找对应模板，校验必需 `## section` 还在。复用 `template.mjs` 派生必需 section，不重写清单。

## Section 3 · 收尾闸门 + references 瘦身 + 单一来源收口

**(a) 易忘小动作硬化——三道防线**：

| 防线 | 做法 | 抓什么 |
|---|---|---|
| 收尾闸门 checklist | ingest/deep-analysis/update 每个 skill 末尾一段祈使清单（放最后抗 context 衰减）：`updated=今天` / `sources 有证据` / `双链双向闭环` / `该打 stale 打了` / `partial 已挂账 coverage` / `log 记了` | agent 中途遗忘 |
| 原子工具 | partial 契约 + coverage 行一条命令；scaffold 自带 frontmatter 字段齐 | 格式/挂账漏做 |
| lint 兜底 | 模板符合度 + partial↔coverage 一致性 | 前两道漏网事后抓 |

checklist 不重新声明规则，只列"动作 + 指向哪条 reference"，保持单一来源。

**(b) references 瘦身**：page-shapes.md 250 → ~50 行瘦索引（页型 | 用途一句话 | 模板 | 刚性边界）。骨架全搬进 templates/。authoring SKILL.md "参考文件"表加 templates/ 行，语气从"写入前必查全部"改成路由："写 X 页 → 先 `scaffold X` 拿骨架（或读 templates/X）；只在建关系时才读 link-contract"。核心：让 agent 知道这次只需读哪一片，不防御性全吞。

**(c) 单一来源纪律（写进 directory-contract）**：

```
页面结构  → templates/{type}.template.md   (script/lint/page-shapes 都从这派生)
frontmatter字段/枚举 → frontmatter-schema.md (templates 的 frontmatter 必须 ⊆ 此)
落点路径  → directory-contract.md          (scaffold 路径映射镜像它,注释标同步)
关系规则  → link-contract.md
```

骨架不在任何地方被抄第二遍。

## 落地阶段（每阶段独立可验证）

1. 建 templates/ 全套模板 + 砍 page-shapes.md 成索引表。
2. 拆脚本模块 + template.mjs（loader + 路径映射）+ scaffold/types 命令。
3. 三 skill 加收尾闸门 + scaffold 原子 partial + lint 模板符合度校验。
4. 收口：README / memory / 各 skill 交叉引用 + 单一来源纪律写进 directory-contract。

## 不在范围（YAGNI）

- 不引入向量库 / embedding。
- 不把模板做成可配置 DSL；纯 markdown + `{{}}` / `<!-- 填 -->` 两种标记足够。
- 不强制 agent 必须用脚本：scaffold 是优先路径，模板文件本身可读，手抄兜底仍可行。
- 不动六视图 / coverage / partial 等已定方法论，只改"怎么让 agent 照做"。

## 风险与缓解

- **新漂移源**：scaffold 路径映射 vs directory-contract、模板 frontmatter vs schema。缓解：注释标同步点，并由 lint 校验（模板 frontmatter ⊆ schema、路径映射有测试）。
- **模板膨胀**：页型多。缓解：每个模板是小文件，agent 只读其一；叙事页只锁骨架不锁内容。
- **脚本不可用**：缓解：模板文件可读、page-shapes 索引指向它、checklist 仍在文档里，纯 markdown 流程可手工兜底。
