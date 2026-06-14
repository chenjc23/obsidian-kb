---
name: obsidian-kb-authoring
description: Use whenever creating, editing, or reviewing product-line Obsidian code knowledge-base pages. Applies Obsidian Markdown syntax through obsidian-markdown and defines the product-line code-kb page schema, properties, source evidence, confidence, status, and bidirectional link contract.
---

# Product-Line Obsidian Code KB Authoring

This skill defines the knowledge engineering contract for `code-kb/`.

When writing notes:

1. Follow `obsidian-markdown` for Obsidian syntax.
2. Follow this skill for product-line code knowledge rules.

## Default Knowledge Base Root

```text
{current working directory}/code-kb
```

Use another path only when the user explicitly specifies one.

## Directory Contract

```text
code-kb/
  index.md
  product-line.md
  glossary.md
  global/
    system-architecture.md
    dependency-graph.md
    business-domain-map.md
    contract-map.md
    data-flow.md
    risk-map.md
    shared-patterns.md
    cross-repo-concerns.md
  domains/
    {业务域}.md
  flows/
    {端到端流程}.md
  contracts/
    {契约名}.md
  repos/
    {repo-name}/
      overview.md
      architecture.md
      modules/
        {模块名}.md
      flows/
        {仓内流程}.md
      api-surface.md
      data-models.md
      config-and-env.md
      error-handling.md
      testing-strategy.md
      key-implementations.md
      gotchas.md
  indexes/
    domain-index.md
    flow-index.md
    module-index.md
    contract-index.md
    term-index.md
    source-index.md
  log.md
```

## Required Properties

Every page starts with Obsidian properties:

```yaml
---
title: 业务开通端到端流程
type: flow
scope: product-line
repo: global
domain:
  - 业务开通
tags:
  - code-kb/flow
  - domain/业务开通
aliases:
  - 开通流程
  - Service Provisioning
created: 2026-06-12
updated: 2026-06-12
sources:
  - repos/order-service/src/orders/create.ts:createOrder()
confidence: high
status: active
---
```

Required common fields:

- `title`
- `type`
- `scope`
- `repo`
- `created`
- `updated`
- `sources`
- `confidence`
- `status`

Recommended common fields:

- `domain`
- `tags`
- `aliases`

Allowed confidence values:

- `high`: directly supported by explicit source or stable architecture notes.
- `medium`: inferred from multiple knowledge base pages or code locations.
- `low`: based on incomplete evidence, naming, stale notes, or unresolved links.

Allowed status values:

- `active`
- `stale`
- `draft`
- `deprecated`

## Page Types

- `product-line`
- `glossary`
- `domain`
- `flow`
- `contract`
- `module`
- `repo-overview`
- `architecture`
- `api`
- `data-model`
- `config`
- `implementation`
- `risk`
- `index`
- `log`

## Type-Specific Properties

Flow pages may include:

```yaml
entry-point:
  - repos/order-service/src/orders/create.ts:createOrder()
related-contracts:
  - CreateServiceOrder
related-modules:
  - order-service/订单编排
```

Contract pages may include:

```yaml
contract-kind: http
producer:
  - resource-service
consumer:
  - order-service
version: v1
```

Module pages may include:

```yaml
module-owner: order-service
public-entry:
  - src/modules/order/index.ts
depends-on:
  - resource-service/资源分配
```

## Link Contract

Maintain bidirectional wikilinks for these relationships:

1. Domain to flow.
2. Flow to contract.
3. Flow to module.
4. Contract to producer and consumer.
5. Term to domain, flow, data model, and code identifier.
6. Risk to flow, contract, module, and source evidence.

Use Obsidian wikilinks for knowledge base pages:

```markdown
[[domains/业务开通]]
[[flows/业务开通端到端流程]]
[[contracts/AllocateResource]]
[[repos/resource-service/modules/资源分配]]
[[global/risk-map#资源预占一致性]]
```

## Source Evidence

Use durable source references:

```text
repos/order-service/src/orders/create.ts:createOrder()
repos/resource-service/src/resource/allocate.ts:allocateResource()
```

Do not use line numbers in durable knowledge base references.

If source evidence is missing or incomplete:

- Set `confidence: low`.
- Explain the missing evidence in the body.
- Do not invent behavior.

## Writing Rules

- Write knowledge prose in Chinese by default.
- Preserve code identifiers, file paths, API names, protocol names, library names, and technical terms in original spelling.
- Start with the conclusion: the first three lines should tell an agent why the page matters.
- Keep one page focused on one topic.
- Split very large flow or module notes instead of creating unreadable pages.
- Respect human-written content. Merge or append rather than overwrite.

## Final Checks

Before finishing any write:

- Required properties exist.
- `updated` uses the current date.
- `sources` lists real evidence or the page explains why evidence is missing.
- Meaningful wikilinks have reverse links where practical.
- New pages have at least one incoming link or are intentional entry pages.
- `log.md` records meaningful write-oriented operations.
