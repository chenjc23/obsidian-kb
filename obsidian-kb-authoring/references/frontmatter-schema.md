# Frontmatter Schema（唯一来源）

**这是知识库所有页面 frontmatter 的唯一权威定义。** `obsidian-kb-ingest`、`obsidian-kb-deep-analysis` 及任何写入 `code-kb/` 的 skill 都引用本文件，**不得各自重新声明 schema**——单一来源确保所有写入方的 frontmatter 一致。

设计目标：**最小化手写字段 + 最大化 agent 可查询性 + 消除重复声明**。字段分三档。

## Tier 1 · 核心（每页必含）

```yaml
---
title: 业务开通端到端流程        # 人类可读标题
type: flow                       # 页面种类,见下方枚举
view: usecase                    # 架构视图;默认由 type 推出,跨视镜才显式覆盖
created: 2026-06-12              # 创建日期
updated: 2026-06-12              # 最近更新日期(写入时必须刷新为当天)
sources:                         # 源码证据,durable 引用,不带行号
  - repos/order-service/src/orders/create.ts:createOrder()
confidence: high                 # high | medium | low
status: active                   # active | stale | draft | deprecated
---
```

`view` 默认值由 `type` 推出（映射表见 [view-model.md](view-model.md)），**只有当页面的主视镜不同于 type 默认时**（主要是 `type: flow` 的端到端业务场景应写 `view: usecase`）才显式写出。

`sources` 通常是源码证据；**外部知识来源**可为文档路径/URL，或 `external: {简述} ({日期})`（粘贴文本无文件时）。

## Tier 2 · 由路径推导（出现即可，但取值由路径决定，勿手维护）

```yaml
repo: order-service              # 工作区页写 global;仓内页 = 目录名,可由模板/工具填
```

- 仓内页的 `repo` **从路径 `repos/{name}/` 推出**——模板或工具填写，不靠手工保证一致。
- 工作区页一律 `repo: global`。
- **不使用以下字段**：`scope`（与 `repo` 蕴含）、`module-owner`（= 页面路径）、`analysis-depth`（深流程由所在 `flows/{topic}/` 文件夹位置即可判定）。

## Tier 3 · 关系（单一来源 = 正文双链；仅按需提升到 frontmatter，且为工具同步）

关系的**唯一真相源是正文 wikilinks**。下列字段只为 query 影响面遍历提供结构化检索，**视为正文双链的结构化镜像，禁止与正文双链各自独立手维护**（两份手维护必然漂移）。详见 [link-contract.md](link-contract.md)。

```yaml
# flow / use-case 页
entry-point:                     # 统一为列表 path:func() 格式(不用引号标量)
  - repos/order-service/src/orders/create.ts:createOrder()
domain:                          # 结构化业务域(不用 domain/X tag 重复声明)
  - 业务开通
related-flows:
  - repos/resource-service/flows/资源分配
related-contracts:
  - CreateServiceOrder
related-modules:
  - order-service/订单编排

# contract 页(契约视图核心,producer/consumer 是影响传播边,强制 + 可校验)
contract-kind: http              # http | rpc | mq | event | tlv | socket | frame
producer:
  - resource-service
consumer:
  - order-service
version: v1

# module 页
public-entry:
  - src/modules/order/index.ts
depends-on:                      # 模块依赖,影响视图遍历的边,强制 + 可校验
  - resource-service/资源分配

# use-case 页
actors:
  - 开通用户
```

## Tier 4 · 可选 Obsidian UX

```yaml
tags:                            # 仅供 Obsidian 图谱/检索;禁止编码 type/view/repo/domain
  - code-kb
aliases:
  - 开通流程
  - Service Provisioning
```

**重复声明禁令（务必遵守）：**

- `tags` **不得**重复声明 `type`/`view`/`repo`/`domain`——它们各有专用字段。不使用 `code-kb/{type}`、`domain/{x}` 这类把已有字段塞进 tag 的写法。
- `domain` 用 Tier 3 结构化字段，不用 tag。

## 枚举值

**`type`：**
`use-case` · `domain` · `glossary` · `flow` · `candidate` · `contract` · `module` · `architecture` · `api-surface` · `data-model` · `config` · `implementation` · `runtime-notes` · `risk` · `index` · `log` · `extra`

**`view`：** `usecase` · `logical` · `development` · `runtime` · `contract` · `impact` · `meta`

**`confidence`：**
- `high`：被显式源码或稳定架构笔记直接支撑。
- `medium`：从多个知识库页面或代码位置推断。
- `low`：基于不完整证据、命名、陈旧笔记或未解析链接。

**`status`：**
- `active`：当前有效。
- `stale`：底层代码已变，等待 `obsidian-kb-update` 刷新（增量阶段打此标记，不重写）。
- `draft`：草稿。
- `deprecated`：已废弃。
