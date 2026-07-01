# 流程编排注册化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 ingest/deep-analysis 的流程编排从各 SKILL.md 的自然语言 Phase 散文,抽进 `registry.yaml` 的 `pipelines:` 声明式注册表,新增 `pipeline status/next/done` 命令做混合执行器(脚本算状态、agent 写内容),SKILL 塌成薄执行器。

**Architecture:** 三层——数据层(`registry.yaml` 的 `pipelines:`,每 stage = id/produces/requires/instruction/tracks/done);指导层(`obsidian-kb-authoring/pipelines/{name}/{stage}.md` 小文件,只写这步动作、约束引用 references);执行层(`lib/pipeline.mjs` 纯函数引擎 + CLI 命令 + 薄 SKILL)。

**Tech Stack:** Node.js(零依赖,ESM `.mjs`)、`node:test` + `node:assert/strict`、自研 YAML 解析器 `lib/yaml.mjs`、YAML 注册表 `obsidian-kb-authoring/registry.yaml`。

## Global Constraints

- **零运行时依赖**:不新增任何第三方 npm 包;只用 `node:*` 内置模块。
- **skill 自包含、可独立拷贝**:脚本留在 `using-obsidian/scripts/`,instruction 文件留 `obsidian-kb-authoring/pipelines/`,不抽到仓库根;状态文件存 `{kb-root}/.obsidian-kb/`(知识库产物侧,不入 skill 仓库)。
- **现有测试零回退**:不改动现有测试源;`registry.yaml` 现有 `schema:`/`types:` 一字不动,只新增 `pipelines:` 顶层键。
- **文档写作风格**(instruction/SKILL):产品 spec 不写历史(不写"原/已废除/相比早期");大白话不用黑话编号;单一来源不复述 schema/目录/约束(引用 `authoring/references/`);嵌套 markdown 代码围栏用四反引号。
- **测试运行命令**:`node --test using-obsidian/scripts/lib/*.test.mjs using-obsidian/scripts/*.test.mjs`(在仓库根 `F:\obsidian-kb` 运行)。
- **commit 规范**:conventional commits(`feat:`/`test:`/`docs:`/`refactor:`);不加 attribution 尾注(本仓惯例)。

---

## File Structure

**新建:**
- `using-obsidian/scripts/lib/pipeline.mjs` — pipeline 引擎(纯函数:done 判定 / DAG status / next / 状态读写)
- `using-obsidian/scripts/lib/pipeline.test.mjs` — 引擎单测
- `obsidian-kb-authoring/pipelines/ingest/{terrain,submodules,candidate-flows,supplements,domains-contracts,backlinks,coverage,deep-dive}.md` — 8 个 ingest stage 指导
- `obsidian-kb-authoring/pipelines/deep-analysis/{call-tree,main-flow,branches,cross-boundary,data-structures,self-check}.md` — 6 个 deep-analysis stage 指导

**修改:**
- `obsidian-kb-authoring/registry.yaml` — 新增 `pipelines:` 顶层键
- `using-obsidian/scripts/lib/registry.mjs` — 加 `authoringDir()` 导出 + `pipelines` 校验
- `using-obsidian/scripts/lib/yaml.test.mjs` — 加 pipelines 嵌套解析回归测试
- `using-obsidian/scripts/lib/describe.mjs` + `describe.test.mjs` — 加 `pipeline` section
- `using-obsidian/scripts/lib/cli.mjs` — 加 `pipeline status/next/done` 命令
- `using-obsidian/scripts/obsidian-kb.test.mjs` — 加 pipeline CLI 冒烟
- `obsidian-kb-ingest/SKILL.md` + `obsidian-kb-deep-analysis/SKILL.md` — 塌缩成薄执行器

**依赖顺序:** P1(解析器确认)→ P2(引擎)→ P3(registry+instruction)→ P4(CLI+describe)→ P5(SKILL 塌缩)→ P6(冒烟+去冗余)。P2 的纯函数用内联 fixture 测,不依赖 P3 的真实 registry。

---

## Phase P1:YAML 嵌套解析确认

### Task 1: 确认 parseYaml 能解析 pipelines 嵌套形态

**Files:**
- Test: `using-obsidian/scripts/lib/yaml.test.mjs`(现有,追加)
- Modify(仅当测试失败): `using-obsidian/scripts/lib/yaml.mjs`

**Interfaces:**
- Consumes: `parseYaml(text)` from `./yaml.mjs`(已存在,返回嵌套 object/array)
- Produces: 无新导出;确认 `parseYaml` 支持「sequence 项为 map、map 内含 inline list 与嵌套 map」。

- [ ] **Step 1: 追加失败测试**

在 `using-obsidian/scripts/lib/yaml.test.mjs` 末尾追加:

```javascript
test('parseYaml handles pipeline nesting: seq items with inline lists and nested maps', () => {
  const text = `pipelines:
  ingest:
    description: first pass
    stages:
      - id: terrain
        produces: [repos/{repo}/overview.md, repos/{repo}/architecture.md]
        requires: []
        instruction: pipelines/ingest/terrain.md
        done:
          exists: produces
          noPlaceholder: true
      - id: deep-dive
        requires: [terrain]
        tracks: repos/{repo}/candidate-flow.md
        done:
          tracksAllComplete: 已深挖
`;
  const reg = parseYaml(text);
  const stages = reg.pipelines.ingest.stages;
  assert.equal(reg.pipelines.ingest.description, 'first pass');
  assert.equal(stages.length, 2);
  assert.equal(stages[0].id, 'terrain');
  assert.deepEqual(stages[0].produces, ['repos/{repo}/overview.md', 'repos/{repo}/architecture.md']);
  assert.deepEqual(stages[0].requires, []);
  assert.equal(stages[0].instruction, 'pipelines/ingest/terrain.md');
  assert.equal(stages[0].done.exists, 'produces');
  assert.equal(stages[0].done.noPlaceholder, true);
  assert.equal(stages[1].done.tracksAllComplete, '已深挖');
  assert.deepEqual(stages[1].requires, ['terrain']);
});
```

确认 `yaml.test.mjs` 顶部已有 `import test from 'node:test'`、`import assert from 'node:assert/strict'`、`import { parseYaml } from './yaml.mjs'`(若无则补 import)。

- [ ] **Step 2: 运行测试**

Run: `node --test using-obsidian/scripts/lib/yaml.test.mjs`
Expected: **大概率直接 PASS**(现有 `parseSequence` 已支持该形态)。

- [ ] **Step 3(仅当 Step 2 失败):修复 yaml.mjs**

若失败,定位失败断言:通常是 `done.noPlaceholder` 被解析成字符串 `'true'` 而非布尔。若需要布尔支持,在 `parseScalar`(`using-obsidian/scripts/lib/yaml.mjs`)的 `null/~` 判断后加:

```javascript
  if (v === 'true') return true;
  if (v === 'false') return false;
```

若失败是嵌套结构错乱,则不改——回到 Step 1 核对测试 YAML 缩进(必须 2 空格)。重跑 Step 2 直到 PASS。

> **注意:** 若 Step 2 直接通过,说明 `noPlaceholder` 已是字符串 `'true'`。P2 的 `stageDone` 用真值判断(`stage.done.noPlaceholder`),字符串 `'true'` 也是真值,不影响。但为语义清晰,**推荐执行 Step 3 的布尔补丁**并保留测试对 `=== true` 的断言。

- [ ] **Step 4: 提交**

```bash
git add using-obsidian/scripts/lib/yaml.test.mjs using-obsidian/scripts/lib/yaml.mjs
git commit -m "test: 确认 parseYaml 支持 pipelines 嵌套形态"
```

---

## Phase P2:pipeline 引擎(`lib/pipeline.mjs`)

> P2 全部用内联临时目录 fixture 测试,不依赖真实 registry。引擎函数是纯函数:接受 stage/pipeline 对象 + 上下文,返回判定结果。

### Task 2: registry.mjs 导出 authoringDir + tracksAllComplete 解析

**Files:**
- Modify: `using-obsidian/scripts/lib/registry.mjs`(加一个导出)
- Create: `using-obsidian/scripts/lib/pipeline.mjs`
- Test: `using-obsidian/scripts/lib/pipeline.test.mjs`

**Interfaces:**
- Consumes: `AUTHORING` 常量(registry.mjs 内部已有 `const AUTHORING = path.resolve(HERE, '../../../obsidian-kb-authoring')`)
- Produces:
  - `authoringDir()` → 返回 authoring 目录绝对路径(registry.mjs 新增导出)
  - `tracksAllComplete(ledgerText, doneValue)` → boolean(pipeline.mjs 新增)。解析 candidate-flow markdown 表,末列为状态列;所有数据行末列 === doneValue 即 true;无数据行(空表)返回 true。

- [ ] **Step 1: 写失败测试(建 pipeline.test.mjs)**

创建 `using-obsidian/scripts/lib/pipeline.test.mjs`:

```javascript
import test from 'node:test';
import assert from 'node:assert/strict';
import { tracksAllComplete } from './pipeline.mjs';

const LEDGER_HEAD = `# R 已识别流程清单
## Deep Analysis 流程清单
| 分析顺序 | 流程名称 | 入口/接口 | 触发方式 | 涉及仓库/模块 | 是否跨消息边界 | 风险等级 | 推荐原因 | 证据链 | 可达性 | confidence | 状态 |
|---|---|---|---|---|---|---|---|---|---|---|---|`;

test('tracksAllComplete: all rows complete → true', () => {
  const text = `${LEDGER_HEAD}
| 1 | flowA | e | t | R | 否 | 高 | r | c | target | high | 已深挖 |
| 2 | flowB | e | t | R | 否 | 中 | r | c | target | high | 已深挖 |`;
  assert.equal(tracksAllComplete(text, '已深挖'), true);
});

test('tracksAllComplete: one row pending → false', () => {
  const text = `${LEDGER_HEAD}
| 1 | flowA | e | t | R | 否 | 高 | r | c | target | high | 已深挖 |
| 2 | flowB | e | t | R | 否 | 中 | r | c | target | high | 待深挖 |`;
  assert.equal(tracksAllComplete(text, '已深挖'), false);
});

test('tracksAllComplete: empty ledger (only placeholder comment) → true', () => {
  const text = `${LEDGER_HEAD}
<!-- 填:每个识别到的流程一行 -->`;
  assert.equal(tracksAllComplete(text, '已深挖'), true);
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test using-obsidian/scripts/lib/pipeline.test.mjs`
Expected: FAIL(`Cannot find module './pipeline.mjs'` 或 `tracksAllComplete is not a function`)

- [ ] **Step 3: 实现 tracksAllComplete(建 pipeline.mjs)**

创建 `using-obsidian/scripts/lib/pipeline.mjs`:

```javascript
import { existsSync, readFileSync } from 'node:fs';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { authoringDir } from './registry.mjs';

// 解析 candidate-flow markdown 表:取每个数据行的末列(状态列)。
// 数据行 = 以 | 开头、非分隔行(|---)、非表头(含"分析顺序")。
// 空表(无数据行)视为完成(vacuously true)。
export function tracksAllComplete(ledgerText, doneValue) {
  const rows = ledgerText.replace(/\r\n/g, '\n').split('\n')
    .map((l) => l.trim())
    .filter((l) => l.startsWith('|'))
    .filter((l) => !/^\|\s*-/.test(l))
    .filter((l) => !l.includes('分析顺序'));
  if (rows.length === 0) return true;
  for (const row of rows) {
    const cells = row.split('|').map((c) => c.trim());
    // 去掉首尾空单元(| a | b | → ['', 'a', 'b', ''])
    const trimmed = cells.filter((c, i) => !(c === '' && (i === 0 || i === cells.length - 1)));
    const last = trimmed[trimmed.length - 1];
    if (last !== doneValue) return false;
  }
  return true;
}
```

在 `using-obsidian/scripts/lib/registry.mjs` 的导出区(靠近 `templatesDir`)加:

```javascript
export function authoringDir() { return AUTHORING; }
```

- [ ] **Step 4: 运行测试确认通过**

Run: `node --test using-obsidian/scripts/lib/pipeline.test.mjs`
Expected: PASS(3 个 tracksAllComplete 测试通过)

- [ ] **Step 5: 提交**

```bash
git add using-obsidian/scripts/lib/pipeline.mjs using-obsidian/scripts/lib/pipeline.test.mjs using-obsidian/scripts/lib/registry.mjs
git commit -m "feat: pipeline 引擎 tracksAllComplete + authoringDir 导出"
```

---

### Task 3: 占位填充 + 状态文件读写

**Files:**
- Modify: `using-obsidian/scripts/lib/pipeline.mjs`
- Test: `using-obsidian/scripts/lib/pipeline.test.mjs`

**Interfaces:**
- Produces:
  - `fillPlaceholders(str, { repo, topic })` → string(`{repo}`/`{topic}` 替换,缺省替空串)
  - `readState(kbRoot)` → object(读 `{kbRoot}/.obsidian-kb/pipeline-state.json`,不存在返回 `{}`)
  - `markStageDone(kbRoot, pipelineName, stageId)` → Promise<void>(写入 `state[pipelineName][stageId] = true`)

- [ ] **Step 1: 追加失败测试**

在 `pipeline.test.mjs` 追加(顶部 import 补 `mkdtemp` 等):

```javascript
import { mkdtemp, readFile as readF } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fillPlaceholders, readState, markStageDone } from './pipeline.mjs';

test('fillPlaceholders replaces repo and topic', () => {
  assert.equal(fillPlaceholders('repos/{repo}/flows/{topic}/x.md', { repo: 'R', topic: 'T' }),
    'repos/R/flows/T/x.md');
  assert.equal(fillPlaceholders('repos/{repo}/overview.md', { repo: 'R' }), 'repos/R/overview.md');
});

test('readState returns {} when no state file', async () => {
  const kb = await mkdtemp(path.join(tmpdir(), 'kb-'));
  assert.deepEqual(await readState(kb), {});
});

test('markStageDone then readState round-trips', async () => {
  const kb = await mkdtemp(path.join(tmpdir(), 'kb-'));
  await markStageDone(kb, 'ingest', 'supplements');
  const state = await readState(kb);
  assert.equal(state.ingest.supplements, true);
  const raw = await readF(path.join(kb, '.obsidian-kb', 'pipeline-state.json'), 'utf8');
  assert.match(raw, /supplements/);
});
```

- [ ] **Step 2: 运行确认失败**

Run: `node --test using-obsidian/scripts/lib/pipeline.test.mjs`
Expected: FAIL(`fillPlaceholders is not a function`)

- [ ] **Step 3: 实现**

在 `pipeline.mjs` 追加:

```javascript
export function fillPlaceholders(str, { repo = '', topic = '' } = {}) {
  return str.replaceAll('{repo}', repo).replaceAll('{topic}', topic);
}

function statePath(kbRoot) {
  return path.join(kbRoot, '.obsidian-kb', 'pipeline-state.json');
}

export async function readState(kbRoot) {
  const p = statePath(kbRoot);
  if (!existsSync(p)) return {};
  try {
    return JSON.parse(await readFile(p, 'utf8'));
  } catch {
    return {};
  }
}

export async function markStageDone(kbRoot, pipelineName, stageId) {
  const state = await readState(kbRoot);
  if (!state[pipelineName]) state[pipelineName] = {};
  state[pipelineName][stageId] = true;
  const p = statePath(kbRoot);
  await mkdir(path.dirname(p), { recursive: true });
  await writeFile(p, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
}
```

- [ ] **Step 4: 运行确认通过**

Run: `node --test using-obsidian/scripts/lib/pipeline.test.mjs`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add using-obsidian/scripts/lib/pipeline.mjs using-obsidian/scripts/lib/pipeline.test.mjs
git commit -m "feat: pipeline 占位填充与状态文件读写"
```

---

### Task 4: stageDone 完成判定引擎

**Files:**
- Modify: `using-obsidian/scripts/lib/pipeline.mjs`
- Test: `using-obsidian/scripts/lib/pipeline.test.mjs`

**Interfaces:**
- Consumes: `fillPlaceholders`、`tracksAllComplete`、`readState`(Task 2/3)
- Produces:
  - `stageDone(stage, ctx)` → Promise<boolean>。`ctx = { kbRoot, repo, topic, pipelineName, state }`。判定优先级:`done.instructionSelfReport` → 查 state;`done.tracksAllComplete` → 读 `stage.tracks` 文件;否则默认 `done.exists`(produces 全在)+ 可选 `done.noPlaceholder`。无 `done` 字段或无 produces 的普通 stage:回退到 instructionSelfReport 语义(靠 state)。

- [ ] **Step 1: 追加失败测试**

在 `pipeline.test.mjs` 追加(import 补 `writeFile`, `mkdir`):

```javascript
import { writeFile as writeF, mkdir as mkdirF } from 'node:fs/promises';
import { stageDone } from './pipeline.mjs';

async function seedFile(kb, rel, content) {
  const full = path.join(kb, rel);
  await mkdirF(path.dirname(full), { recursive: true });
  await writeF(full, content, 'utf8');
}

test('stageDone exists+noPlaceholder: true when files exist and no 填 marker', async () => {
  const kb = await mkdtemp(path.join(tmpdir(), 'kb-'));
  await seedFile(kb, 'repos/R/overview.md', '# ok\n内容\n');
  const stage = { id: 'terrain', produces: ['repos/{repo}/overview.md'], done: { exists: 'produces', noPlaceholder: true } };
  assert.equal(await stageDone(stage, { kbRoot: kb, repo: 'R', pipelineName: 'ingest', state: {} }), true);
});

test('stageDone noPlaceholder: false when 填 marker remains', async () => {
  const kb = await mkdtemp(path.join(tmpdir(), 'kb-'));
  await seedFile(kb, 'repos/R/overview.md', '# ok\n<!-- 填:定位 -->\n');
  const stage = { id: 'terrain', produces: ['repos/{repo}/overview.md'], done: { exists: 'produces', noPlaceholder: true } };
  assert.equal(await stageDone(stage, { kbRoot: kb, repo: 'R', pipelineName: 'ingest', state: {} }), false);
});

test('stageDone exists: false when produces file missing', async () => {
  const kb = await mkdtemp(path.join(tmpdir(), 'kb-'));
  const stage = { id: 'terrain', produces: ['repos/{repo}/overview.md'], done: { exists: 'produces' } };
  assert.equal(await stageDone(stage, { kbRoot: kb, repo: 'R', pipelineName: 'ingest', state: {} }), false);
});

test('stageDone exists: directory produces (trailing slash) checks dir', async () => {
  const kb = await mkdtemp(path.join(tmpdir(), 'kb-'));
  await seedFile(kb, 'repos/R/submodules/x/上下文.md', '# x\n');
  const stage = { id: 'submodules', produces: ['repos/{repo}/submodules/'], done: { exists: 'produces' } };
  assert.equal(await stageDone(stage, { kbRoot: kb, repo: 'R', pipelineName: 'ingest', state: {} }), true);
});

test('stageDone tracksAllComplete reads tracks file', async () => {
  const kb = await mkdtemp(path.join(tmpdir(), 'kb-'));
  await seedFile(kb, 'repos/R/candidate-flow.md',
    '| 分析顺序 | 状态 |\n|---|---|\n| 1 | 已深挖 |\n');
  const stage = { id: 'deep-dive', tracks: 'repos/{repo}/candidate-flow.md', done: { tracksAllComplete: '已深挖' } };
  assert.equal(await stageDone(stage, { kbRoot: kb, repo: 'R', pipelineName: 'ingest', state: {} }), true);
});

test('stageDone instructionSelfReport reads state', async () => {
  const kb = await mkdtemp(path.join(tmpdir(), 'kb-'));
  const stage = { id: 'backlinks', done: { instructionSelfReport: true } };
  assert.equal(await stageDone(stage, { kbRoot: kb, repo: 'R', pipelineName: 'ingest', state: {} }), false);
  assert.equal(await stageDone(stage, { kbRoot: kb, repo: 'R', pipelineName: 'ingest', state: { ingest: { backlinks: true } } }), true);
});
```

- [ ] **Step 2: 运行确认失败**

Run: `node --test using-obsidian/scripts/lib/pipeline.test.mjs`
Expected: FAIL(`stageDone is not a function`)

- [ ] **Step 3: 实现 stageDone**

在 `pipeline.mjs` 追加:

```javascript
// produces 项以 / 结尾 = 目录(存在且非空);否则文件存在。
function producesExist(stage, ctx) {
  const items = stage.produces || [];
  for (const raw of items) {
    const rel = fillPlaceholders(raw, ctx);
    const full = path.join(ctx.kbRoot, rel);
    if (rel.endsWith('/')) {
      if (!existsSync(full)) return false;
      const kids = readdirSafe(full);
      if (kids.length === 0) return false;
    } else if (!existsSync(full)) {
      return false;
    }
  }
  return true;
}

function readdirSafe(dir) {
  try { return readdirSync(dir); } catch { return []; }
}

function noPlaceholderInProduces(stage, ctx) {
  for (const raw of stage.produces || []) {
    const rel = fillPlaceholders(raw, ctx);
    if (rel.endsWith('/')) continue; // 目录不逐文件扫,交给内部页各自 stage
    const full = path.join(ctx.kbRoot, rel);
    if (!existsSync(full)) return false;
    if (/<!--\s*填/.test(readFileSync(full, 'utf8'))) return false;
  }
  return true;
}

export async function stageDone(stage, ctx) {
  const done = stage.done || {};
  if (done.instructionSelfReport) {
    return ctx.state?.[ctx.pipelineName]?.[stage.id] === true;
  }
  if (done.tracksAllComplete) {
    const rel = fillPlaceholders(stage.tracks, ctx);
    const full = path.join(ctx.kbRoot, rel);
    if (!existsSync(full)) return false;
    return tracksAllComplete(await readFile(full, 'utf8'), done.tracksAllComplete);
  }
  // 默认档:exists(+ 可选 noPlaceholder)。无 produces 声明时回退 self-report。
  if (!stage.produces || stage.produces.length === 0) {
    return ctx.state?.[ctx.pipelineName]?.[stage.id] === true;
  }
  if (!producesExist(stage, ctx)) return false;
  if (done.noPlaceholder && !noPlaceholderInProduces(stage, ctx)) return false;
  return true;
}
```

更新 `pipeline.mjs` 顶部 import,补 `readdirSync`:

```javascript
import { existsSync, readFileSync, readdirSync } from 'node:fs';
```

- [ ] **Step 4: 运行确认通过**

Run: `node --test using-obsidian/scripts/lib/pipeline.test.mjs`
Expected: PASS(全部 stageDone 测试通过)

- [ ] **Step 5: 提交**

```bash
git add using-obsidian/scripts/lib/pipeline.mjs using-obsidian/scripts/lib/pipeline.test.mjs
git commit -m "feat: stageDone 完成判定引擎(exists/noPlaceholder/tracks/selfReport)"
```

---

### Task 5: pipelineStatus 与 pipelineNext(DAG 求值)

**Files:**
- Modify: `using-obsidian/scripts/lib/pipeline.mjs`
- Test: `using-obsidian/scripts/lib/pipeline.test.mjs`

**Interfaces:**
- Consumes: `stageDone`、`readState`、`authoringDir`(读 instruction 正文)
- Produces:
  - `pipelineStatus(pipeline, ctx)` → Promise<Array<{ id, state: 'done'|'ready'|'blocked' }>>。`ready` = 未 done 且所有 `requires` 都 done;`blocked` = 未 done 且有 require 未 done。ctx 无需预置 state(内部 `readState`)。
  - `pipelineNext(pipeline, ctx)` → Promise<{ id, instruction, produces } | { done: true }>。返回第一个 `ready` stage,附 instruction 正文(读 `authoringDir()/{stage.instruction}`)。全 done 返回 `{ done: true }`。

- [ ] **Step 1: 追加失败测试**

在 `pipeline.test.mjs` 追加:

```javascript
import { pipelineStatus, pipelineNext } from './pipeline.mjs';

function twoStagePipeline() {
  return {
    description: 'test',
    stages: [
      { id: 'a', produces: ['repos/{repo}/a.md'], requires: [], done: { exists: 'produces' } },
      { id: 'b', produces: ['repos/{repo}/b.md'], requires: ['a'], done: { exists: 'produces' } },
    ],
  };
}

test('pipelineStatus: nothing done → a ready, b blocked', async () => {
  const kb = await mkdtemp(path.join(tmpdir(), 'kb-'));
  const st = await pipelineStatus(twoStagePipeline(), { kbRoot: kb, repo: 'R', pipelineName: 'ingest' });
  assert.deepEqual(st, [{ id: 'a', state: 'ready' }, { id: 'b', state: 'blocked' }]);
});

test('pipelineStatus: a done → b ready', async () => {
  const kb = await mkdtemp(path.join(tmpdir(), 'kb-'));
  await seedFile(kb, 'repos/R/a.md', '# a\n');
  const st = await pipelineStatus(twoStagePipeline(), { kbRoot: kb, repo: 'R', pipelineName: 'ingest' });
  assert.deepEqual(st, [{ id: 'a', state: 'done' }, { id: 'b', state: 'ready' }]);
});

test('pipelineNext returns first ready stage with instruction body', async () => {
  const kb = await mkdtemp(path.join(tmpdir(), 'kb-'));
  const pipe = twoStagePipeline();
  pipe.stages[0].instruction = 'pipelines/ingest/terrain.md';
  // instruction 正文从真实 authoring 目录读;terrain.md 由 P3 建。此处用不依赖文件的断言:
  const nx = await pipelineNext(pipe, { kbRoot: kb, repo: 'R', pipelineName: 'ingest' });
  assert.equal(nx.id, 'a');
  assert.ok('instruction' in nx);
});

test('pipelineNext returns done when all stages complete', async () => {
  const kb = await mkdtemp(path.join(tmpdir(), 'kb-'));
  await seedFile(kb, 'repos/R/a.md', '# a\n');
  await seedFile(kb, 'repos/R/b.md', '# b\n');
  const nx = await pipelineNext(twoStagePipeline(), { kbRoot: kb, repo: 'R', pipelineName: 'ingest' });
  assert.deepEqual(nx, { done: true });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `node --test using-obsidian/scripts/lib/pipeline.test.mjs`
Expected: FAIL(`pipelineStatus is not a function`)

- [ ] **Step 3: 实现**

在 `pipeline.mjs` 追加:

```javascript
export async function pipelineStatus(pipeline, ctx) {
  const state = await readState(ctx.kbRoot);
  const full = { ...ctx, state };
  const doneMap = new Map();
  const out = [];
  for (const stage of pipeline.stages) {
    // eslint-disable-next-line no-await-in-loop
    const isDone = await stageDone(stage, full);
    doneMap.set(stage.id, isDone);
    let state2;
    if (isDone) state2 = 'done';
    else if ((stage.requires || []).every((r) => doneMap.get(r))) state2 = 'ready';
    else state2 = 'blocked';
    out.push({ id: stage.id, state: state2 });
  }
  return out;
}

export async function pipelineNext(pipeline, ctx) {
  const status = await pipelineStatus(pipeline, ctx);
  const ready = status.find((s) => s.state === 'ready');
  if (!ready) {
    const anyBlocked = status.some((s) => s.state === 'blocked');
    return anyBlocked ? { blocked: true, status } : { done: true };
  }
  const stage = pipeline.stages.find((s) => s.id === ready.id);
  let instruction = '';
  if (stage.instruction) {
    const p = path.join(authoringDir(), stage.instruction);
    instruction = existsSync(p) ? readFileSync(p, 'utf8') : `(instruction 文件缺失: ${stage.instruction})`;
  }
  return { id: stage.id, instruction, produces: stage.produces || [] };
}
```

> **求值依赖顺序**:`pipelineStatus` 按 `pipeline.stages` 数组顺序遍历,`requires` 只能指向更早的 stage。注册表里 stage 必须拓扑有序(前置在前)——P3 写 registry 时保证。

- [ ] **Step 4: 运行确认通过**

Run: `node --test using-obsidian/scripts/lib/pipeline.test.mjs`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add using-obsidian/scripts/lib/pipeline.mjs using-obsidian/scripts/lib/pipeline.test.mjs
git commit -m "feat: pipelineStatus/pipelineNext DAG 求值"
```

---

### Task 6: getPipeline(从 registry 取 pipeline 定义)

**Files:**
- Modify: `using-obsidian/scripts/lib/pipeline.mjs`
- Test: `using-obsidian/scripts/lib/pipeline.test.mjs`

**Interfaces:**
- Consumes: `loadRegistry` from `./registry.mjs`
- Produces: `getPipeline(name)` → pipeline 定义对象;未定义 `pipelines` 或无该 name 时抛 `Error(未知 pipeline: ...)`。

- [ ] **Step 1: 追加失败测试**

在 `pipeline.test.mjs` 追加(import 补 `getPipeline`):

```javascript
import { getPipeline } from './pipeline.mjs';
import { loadRegistry } from './registry.mjs';

test('getPipeline throws on unknown name', () => {
  loadRegistry({ force: true }); // 真实 registry;P3 后含 ingest/deep-analysis
  assert.throws(() => getPipeline('nope'), /未知 pipeline/);
});
```

- [ ] **Step 2: 运行确认失败**

Run: `node --test using-obsidian/scripts/lib/pipeline.test.mjs`
Expected: FAIL(`getPipeline is not a function`)

- [ ] **Step 3: 实现**

在 `pipeline.mjs` 顶部 import 加 `loadRegistry`,追加:

```javascript
export function getPipeline(name) {
  const reg = loadRegistry();
  const pipelines = reg.pipelines || {};
  if (!pipelines[name]) throw new Error(`未知 pipeline: ${name}(可选 ${Object.keys(pipelines).join('|') || '无'})`);
  return pipelines[name];
}
```

顶部 import 改为:

```javascript
import { authoringDir, loadRegistry } from './registry.mjs';
```

- [ ] **Step 4: 运行确认通过**

Run: `node --test using-obsidian/scripts/lib/pipeline.test.mjs`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add using-obsidian/scripts/lib/pipeline.mjs using-obsidian/scripts/lib/pipeline.test.mjs
git commit -m "feat: getPipeline 从 registry 读取 pipeline 定义"
```

---

## Phase P3:registry.yaml pipelines + instruction 文件

### Task 7: registry.yaml 新增 pipelines: + 校验

**Files:**
- Modify: `obsidian-kb-authoring/registry.yaml`(追加 `pipelines:` 顶层键)
- Modify: `using-obsidian/scripts/lib/registry.mjs`(validate 加 pipelines 检查)
- Test: `using-obsidian/scripts/lib/registry.test.mjs`(追加)

**Interfaces:**
- Consumes: `loadRegistry`
- Produces: `reg.pipelines.{ingest,deep-analysis}`;validate 保证每个 stage 的 `instruction` 文件存在、`requires` 指向本 pipeline 已定义 stage。

- [ ] **Step 1: 追加失败测试**

在 `registry.test.mjs` 末尾追加:

```javascript
test('GOLDEN: registry defines ingest and deep-analysis pipelines', () => {
  const reg = loadRegistry({ force: true });
  assert.ok(reg.pipelines.ingest, 'ingest pipeline present');
  assert.ok(reg.pipelines['deep-analysis'], 'deep-analysis pipeline present');
  const ids = reg.pipelines.ingest.stages.map((s) => s.id);
  assert.deepEqual(ids, ['terrain', 'submodules', 'candidate-flows', 'supplements',
    'domains-contracts', 'backlinks', 'coverage', 'deep-dive']);
});

test('GOLDEN: every pipeline stage instruction file exists', () => {
  loadRegistry({ force: true }); // validate 不抛即通过
});
```

- [ ] **Step 2: 运行确认失败**

Run: `node --test using-obsidian/scripts/lib/registry.test.mjs`
Expected: FAIL(`Cannot read properties of undefined (reading 'ingest')`)

- [ ] **Step 3: 追加 pipelines: 到 registry.yaml**

在 `obsidian-kb-authoring/registry.yaml` **文件末尾**追加(与 `schema:`/`types:` 同级,顶格):

```yaml
# ── 流程编排:阶段声明式注册,执行器(pipeline status/next)按 requires DAG 驱动 ──
# 每 stage:id / produces(产物落点,占位 {repo}{topic}) / requires(依赖) /
#   instruction(pipelines/*.md 指导文件) / tracks(追踪表) / done(完成判定)。
# instruction 正文只写这步动作;结构/字段/约束引用 authoring/references。
pipelines:
  ingest:
    description: 首次仓库分析,先建广度再补深度
    stages:
      - id: terrain
        produces: [repos/{repo}/overview.md, repos/{repo}/architecture.md]
        instruction: pipelines/ingest/terrain.md
        requires: []
        done:
          exists: produces
          noPlaceholder: true
      - id: submodules
        produces: [repos/{repo}/submodules/]
        instruction: pipelines/ingest/submodules.md
        requires: [terrain]
        done:
          exists: produces
      - id: candidate-flows
        produces: [repos/{repo}/candidate-flow.md]
        instruction: pipelines/ingest/candidate-flows.md
        requires: [submodules]
        done:
          exists: produces
      - id: supplements
        instruction: pipelines/ingest/supplements.md
        requires: [terrain]
        done:
          instructionSelfReport: true
      - id: domains-contracts
        instruction: pipelines/ingest/domains-contracts.md
        requires: [submodules, supplements]
        done:
          instructionSelfReport: true
      - id: coverage
        produces: [global/architecture/coverage.md]
        instruction: pipelines/ingest/coverage.md
        requires: [domains-contracts]
        done:
          exists: produces
      - id: backlinks
        instruction: pipelines/ingest/backlinks.md
        requires: [domains-contracts, candidate-flows]
        done:
          instructionSelfReport: true
      - id: deep-dive
        instruction: pipelines/ingest/deep-dive.md
        requires: [candidate-flows, coverage, backlinks]
        foreach: candidate-flow
        runs: deep-analysis
        tracks: repos/{repo}/candidate-flow.md
        done:
          tracksAllComplete: 已深挖
  deep-analysis:
    description: 单个函数或流程的详尽追踪
    stages:
      - id: call-tree
        produces: [repos/{repo}/flows/{topic}/调用树.md]
        instruction: pipelines/deep-analysis/call-tree.md
        requires: []
        done:
          exists: produces
          noPlaceholder: true
      - id: main-flow
        produces: [repos/{repo}/flows/{topic}/主干流程.md]
        instruction: pipelines/deep-analysis/main-flow.md
        requires: [call-tree]
        done:
          exists: produces
          noPlaceholder: true
      - id: branches
        instruction: pipelines/deep-analysis/branches.md
        requires: [main-flow]
        done:
          instructionSelfReport: true
      - id: cross-boundary
        instruction: pipelines/deep-analysis/cross-boundary.md
        requires: [main-flow]
        done:
          instructionSelfReport: true
      - id: data-structures
        instruction: pipelines/deep-analysis/data-structures.md
        requires: [main-flow]
        done:
          instructionSelfReport: true
      - id: self-check
        produces: [repos/{repo}/flows/{topic}/自查报告.md]
        instruction: pipelines/deep-analysis/self-check.md
        requires: [branches, cross-boundary, data-structures]
        done:
          exists: produces
          noPlaceholder: true
```

> 注意 stage 顺序即拓扑顺序(coverage 排在 backlinks 前,因为 backlinks 不依赖 coverage 但 deep-dive 依赖两者;数组顺序满足「requires 只指向更早项」)。
>
> `deep-dive` 的 `foreach: candidate-flow` / `runs: deep-analysis` 是**意图声明**(表达「对追踪表每行展开 deep-analysis 子 pipeline」),供 `describe`/人读;引擎不消费这两字段,`deep-dive` 的完成判定就是 `tracksAllComplete: 已深挖`(见 Task 4)。validate 忽略额外字段。

- [ ] **Step 4: 加 validate 校验**

在 `using-obsidian/scripts/lib/registry.mjs` 的 `validate()` 函数末尾(`for...types` 循环之后、函数结束前)追加:

```javascript
  const { pipelines } = reg;
  if (pipelines != null) {
    if (typeof pipelines !== 'object') throw new Error('registry: pipelines must be a mapping');
    const adir = file ? path.dirname(file) : AUTHORING;
    for (const [pname, pdef] of Object.entries(pipelines)) {
      if (!Array.isArray(pdef.stages)) throw new Error(`registry: pipeline ${pname} needs stages list`);
      const seen = new Set();
      for (const stage of pdef.stages) {
        if (!stage.id) throw new Error(`registry: pipeline ${pname} has stage without id`);
        for (const req of stage.requires || []) {
          if (!seen.has(req)) throw new Error(`registry: pipeline ${pname} stage ${stage.id} requires unknown/late stage: ${req}`);
        }
        if (stage.instruction && !existsSync(path.join(adir, stage.instruction))) {
          throw new Error(`registry: pipeline ${pname} stage ${stage.id} instruction not found: ${stage.instruction}`);
        }
        seen.add(stage.id);
      }
    }
  }
```

> 该校验要求 instruction 文件已存在。因此 **Step 5 必须在 Step 6 之前**——先建空的 instruction 文件占位,再让测试通过。实际内容在 Task 8/9 填。为让本 task 自洽,Step 5 建全部 14 个文件(先写最终内容,见 Task 8/9 的完整文本)。

- [ ] **Step 5: 建 instruction 文件(内容见 Task 8/9)**

创建全部 14 个 instruction 文件,内容直接采用 Task 8(ingest 8 个)与 Task 9(deep-analysis 6 个)给出的完整文本。本 task 先落地文件以满足 validate;Task 8/9 作为独立 review 关卡确认内容质量。

```bash
mkdir -p obsidian-kb-authoring/pipelines/ingest obsidian-kb-authoring/pipelines/deep-analysis
```

- [ ] **Step 6: 运行确认通过**

Run: `node --test using-obsidian/scripts/lib/registry.test.mjs using-obsidian/scripts/lib/pipeline.test.mjs`
Expected: PASS(含 Task 6 的 `getPipeline throws on unknown` 与本 task 两测)

- [ ] **Step 7: 提交**

```bash
git add obsidian-kb-authoring/registry.yaml obsidian-kb-authoring/pipelines using-obsidian/scripts/lib/registry.mjs using-obsidian/scripts/lib/registry.test.mjs
git commit -m "feat: registry.yaml 新增 ingest/deep-analysis pipelines + 校验"
```

---

### Task 8: ingest 8 个 instruction 文件内容

**Files:**
- Create: `obsidian-kb-authoring/pipelines/ingest/{terrain,submodules,candidate-flows,supplements,domains-contracts,coverage,backlinks,deep-dive}.md`

**Interfaces:** 无代码接口。每个文件是纯 markdown 指导,遵守 Global Constraints 的文档风格(不复述 schema/目录/约束,引用 references;只写这步特有动作)。源材料 = 现 `obsidian-kb-ingest/SKILL.md` 对应 Phase,精简去冗余。

- [ ] **Step 1: 写 terrain.md**

```markdown
# terrain — 仓库地形扫描

产出:`repos/{repo}/overview.md` + `repos/{repo}/architecture.md`(先 `scaffold overview` / `scaffold architecture` 拿骨架)。

1. 信号驱动的快速地形扫描:先读顶层目录 + manifest/构建文件 + 入口文件,再沿 manifest/build 指向的源码根深入。跳过 `vendor`/`node_modules`/`build`/`dist`/`third_party`/`.git`。`generated/` 默认不深读实现,但 C/C++/通信仓要读其中的协议标识、service 接口、message/enum 定义与自动生成的 dispatch 元数据。目标是建立仓库形状、技术栈、分层、入口区域的认知,不遍历整棵树。
2. 优先读构建/元数据文件(C/C++ 优先):`CMakeLists.txt`、`Makefile`、`conanfile.*`、`vcpkg.json`、Bazel `BUILD`、`README`、`package.json`、`go.mod`、`Cargo.toml`、`pyproject.toml`、`pom.xml`、`build.gradle`、`Dockerfile`。
3. 识别并读入口:`main.c`/`main.cpp`/`src/main.*`/`app/main.cpp`/`main.go`/`index.ts`/`app.py`/`cmd/*`/框架引导模块。
4. 读装配/初始化代码:`main()`、`wire.go`、`container.ts`、`AppModule`、服务注册、路由装配、工厂/单例。
5. `overview.md`:本仓定位、模块定义、职责边界、上下文与依赖边界。
6. `architecture.md`:本仓逻辑视图 + 仓库路由(链向 overview / submodules / flows / 关键 contracts / data-models),含一张 mermaid 架构图(`graph`/`flowchart TD`,呈现分层与核心模块依赖)。
```

- [ ] **Step 2: 写 submodules.md**

```markdown
# submodules — 子模块拆解

产出:`repos/{repo}/submodules/{topic}/` 七件套(先 `scaffold submodule --repo {repo} --topic {主题}`)。

1. 扫核心模块目录,读 index/barrel/export 与公共接口。
2. 分析子模块间 import/include/注册依赖。
3. 每个真实职责边界一个 `submodules/{topic}/` 文件夹;主锚 `上下文`,`状态迁移规则` 无对象状态机则删整文件。不要给每个小文件夹都建页。`{topic}` 默认中文,只留必要英文。
4. 在 frontmatter `depends-on` + 正文双链记录子模块依赖(影响分析的边)。

关系与字段规则见 authoring `references/link-contract.md` 与 `references/frontmatter-schema.md`,不在此复述。
```

- [ ] **Step 3: 写 candidate-flows.md**

```markdown
# candidate-flows — 流程发现与排序(全量清单)

产出:`repos/{repo}/candidate-flow.md`(先 `scaffold candidate-flow --repo {repo}`)。

发现先于深挖:先尽可能枚举所有识别到的流程,再排深度分析顺序。大仓召回不足通常来自过早收敛,入口枚举、证据链确认、同质分支归并都完成后再收尾。

1. 按需读流程发现参考,只读相关一份:C/C++ 子系统读 `references/c-cpp-flow-discovery.md`;非 C/C++ 读 `references/general-flow-discovery.md`。不要两份都读进上下文。
2. 枚举入口、确认三段证据链、判断可达性、过滤常量族噪声、合并同质分支,排出分析顺序。
3. 所有识别到的流程写进同一张 `candidate-flow.md`,初始状态 `待深挖`;分析顺序只决定 deep-dive 的执行先后。
4. 不生成单文件浅流程页。一个 flow 只有两种状态:登记在清单、或已深挖后翻 `已深挖`。
```

- [ ] **Step 4: 写 supplements.md**

```markdown
# supplements — 补充页(有内容才生成)

按适用性产出下列页(先 `scaffold {type}`);本仓不适用的类型直接跳过,全部处理完后 `pipeline done supplements --repo {repo}`。

- `glossary.md`:每个术语必须是代码标识符/注释/README/文档里真实出现的词或缩写,带出处;不编造,缩写无确证不臆测扩写。
- `api-surface.md`:路由、proto、OpenAPI、controller、消息契约(本仓对外接口面)。
- `api-depend.md`:本仓依赖的外部接口、协议、消息、超时/重试/失败影响。
- `data-models.md`:ORM 模型、schema、proto/types、状态结构。
- `specifications.md`:规格、配置加载、env、feature flag、编译宏。
- `constraints.md`:设计原则、硬约束、错误处理、重试/降级、隐式约定与已知陷阱。
- `resource-analysis.md`:CPU/内存/IO/连接/线程/队列等资源占用、容量与退化策略。
- `human-interfaces.md`:CLI、MIB、SNMP 等人机接口。

一页一主题,页型用途见 `describe shapes`,不在此复述。
```

- [ ] **Step 5: 写 domains-contracts.md**

```markdown
# domains-contracts — 业务域与契约提取(只新增页)

修复孤儿视图,发现新的加一页,不回改已有页叙事。处理完后 `pipeline done domains-contracts --repo {repo}`。

1. 逻辑视图 → `global/domains/{业务域}.md`:从 glossary、overview/submodule 职责、README 领域语言聚类业务域,定义概念、不变量、状态、相邻域,链向实现该域的流程。
2. 契约视图 → `global/contracts/{契约名}.md`:把跨边界契约(HTTP/RPC、MQ topic、event、协议消息、TLV/frame)提升为独立契约页,记消息标识、payload schema、producer/consumer、接收方发现证据。建页用 `scaffold contract`。
   - 只找到一端时用 `scaffold contract --partial --side {producer|consumer} --known {repo} --evidence {证据}`:它建 partial 页并自动在 coverage 待接合边表记录,未知端留空,不编造假对端。
3. 深度端到端字段映射留给 deep-analysis,这里只提升定义。
```

- [ ] **Step 6: 写 coverage.md**

```markdown
# coverage — 覆盖记录(只追加)

产出/追加:`global/architecture/coverage.md`(不存在则 `scaffold coverage`)。

append 三类,不回改旧行:
- 本仓覆盖度行(深度 = `只地形扫描` / `子模块已解析` / `流程已深挖`)。
- 本次发现的待接合边(指向未 ingest 仓的调用、单边 partial 契约——partial 契约已由 `scaffold contract --partial` 自动记录,其余手动追加)。
- 已知盲区。

接上某端时才把对应行翻 `已接合`。coverage 的机制与语义见 `references/directory-contract.md`,不在此复述。
```

- [ ] **Step 7: 写 backlinks.md**

```markdown
# backlinks — 双向链接

把本轮新页接进关系图,处理完后 `pipeline done backlinks --repo {repo}`。规则以 `references/link-contract.md` 为准。

1. 子模块↔子模块:A 依赖 B 则 A 链 `[[repos/{repo}/submodules/B/上下文]]`,B 反向链回。
2. 流程↔子模块、流程↔契约、流程↔数据、域↔流程:全部双向。
3. `architecture.md` 列出核心流程与 overview/submodule 链接。
4. 检查每个新页至少一条入链。
```

- [ ] **Step 8: 写 deep-dive.md**

```markdown
# deep-dive — 按清单顺序自动深挖

`candidate-flow.md` 是唯一追踪表。按表中 `分析顺序` 串行深挖每条流程,每完成一条把该行 `状态` 翻 `已深挖`;表全绿本 stage 才完成。

对每条流程,用 `obsidian-kb-deep-analysis`(它自己是一条 pipeline):

1. 优先子 agent 编排:主 agent 为每条流程创建唯一一个专职子 agent,只做一个 deep-analysis 任务。
2. 只给它:一个流程、入口/接口证据、相关仓库、`{kb-root}`,及「用 `obsidian-kb-deep-analysis` + `obsidian-kb-authoring`」的指令。
3. 等它写完笔记、返回摘要;检查失败写入、缺失证据、低置信缺口。
4. 然后才创建下一个流程的子 agent。不并行——深挖会改共享页(data-models/architecture/overview/domains/contracts/log 等)。

流程很多也继续串行,除非用户显式打断、限定范围或要求暂停。
```

- [ ] **Step 9: 校验 + 提交**

Run: `node --test using-obsidian/scripts/lib/registry.test.mjs`
Expected: PASS(instruction 文件存在校验通过)

```bash
git add obsidian-kb-authoring/pipelines/ingest
git commit -m "docs: ingest 8 个 stage instruction 文件"
```

---

### Task 9: deep-analysis 6 个 instruction 文件内容

**Files:**
- Create: `obsidian-kb-authoring/pipelines/deep-analysis/{call-tree,main-flow,branches,cross-boundary,data-structures,self-check}.md`

**Interfaces:** 无代码接口。源材料 = 现 `obsidian-kb-deep-analysis/SKILL.md` 对应 Phase,精简。

- [ ] **Step 1: 写 call-tree.md**(外层四反引号,因内含 ```text 块)

````markdown
# call-tree — 调用树摸底

产出:`repos/{repo}/flows/{topic}/调用树.md`(先 `scaffold flow --repo {repo} --topic {主题}` 一次拿全 6 件套骨架)。`{主题}` 文件夹名默认中文。

从指定入口函数开始递归追踪被调函数。每个函数记录:函数名/签名、仓库根起的文件路径、一句话职责、是否含条件分支及数量、是否外部调用(RPC/DB/MQ/文件系统/网络/子进程)、是否跨协议/消息/事件/topic/socket/TLV 边界、展开后链到对应分支页 `[[分支主题]]`。

树格式示例:

```text
├── computeRoute() [src/route/compute.go] — 算路总入口,3 条分支
│   ├── loadTopology() [src/topo/loader.go] — 加载拓扑,外部调用:DB
│   └── preprocessResource() [src/resource/prep.go] — 资源预处理
```

不用 `...`/「等」/任何占位符跳过节点。超过 200 节点则拆分并在 `自查报告.md` 记录。
````

> **注意:** call-tree.md 是文件正文,内部的 ```text 树格式块用普通三反引号写入。plan 里用四反引号 ````markdown 仅为包裹展示;写文件时去掉最外层四反引号包裹,内层三反引号 text 块照写。

- [ ] **Step 2: 写 main-flow.md**

```markdown
# main-flow — 主干流程分析

产出:`repos/{repo}/flows/{topic}/主干流程.md`。以调用树为基线。

1. 沿最常见/默认路径从入口走到最终返回,独立分析路径上每个函数。
2. 每步含:函数签名与路径、入参出参类型、伪代码级逻辑(非一句话)、读写数据结构、状态变更、分支标记 `此处有 N 条分支路径,将在 branches 展开`。
3. 主路径到达消息/协议/RPC/MQ/event/socket/TLV/topic/handler dispatch/callback 等异步边界时,不在发送方停——跨 workspace 追到接收方入口,把接收方主干处理纳入本文件。

找不到接收方/上游不编造:标 `confidence: low`,记录精确搜索证据,缺口加进 `自查报告.md`。禁止捷径:「类似的处理」「同理」「以此类推」「此处省略」「发送消息后结束」或用 `...` 跳过。
```

- [ ] **Step 3: 写 branches.md**

```markdown
# branches — 分支流程逐个展开

处理完后 `pipeline done branches --repo {repo} --pipeline deep-analysis`。

1. 回到主干每个分支标记;主动从调用树、条件表达式、错误路径、协议/消息分发、状态机迁移、重试、回滚、超时、下游回调发现更多关键分支。
2. 按重要性与风险排序,完整分析每个关键分支。
3. 写在哪按体量决定(避免过度拆文件):简单分支就地写在 `主干流程.md` 对应步骤下;够分量的(逻辑链长、深嵌套、高风险、业务关键、被复用)提取 `{分支主题}.md`。

这是决定「写在哪」不是「要不要分析」——每个关键/高风险分支都必须覆盖。独立成文件的分支需补来源双链(主干 + 调用树节点 + 兄弟/嵌套分支),规则见 `references/link-contract.md`。关键分支未覆盖须以源码证据在 `自查报告.md` 记为缺口,不得用「其他分支类似」敷衍。
```

- [ ] **Step 4: 写 cross-boundary.md**

```markdown
# cross-boundary — 跨消息边界与端到端数据流(契约提升)

产出:`repos/{repo}/flows/{topic}/跨边界数据流.md`(不适用则在 `自查报告.md` 写明原因)。处理完后 `pipeline done cross-boundary --repo {repo} --pipeline deep-analysis`。

遇 TLV、协议帧、消息收发、socket、MQ、RPC、event、topic/handler dispatch、callback 等边界,跨整个 workspace 追到下游接收方或上游调用方,覆盖发送方和接收方完整处理逻辑(不止识别接口/topic/消息 ID)。

契约提升:可复用的契约定义(消息标识、payload schema、字段、producer/consumer、接收方发现证据)提升/同步到 `global/contracts/{契约名}.md`。本文件不重抄 schema,只持有:穿越了哪些边界(各链到 `[[global/contracts/{名}]]`)、本场景发送方业务前置与字段来源、接收方处理结果与副作用、字段映射表、端到端 `mermaid sequenceDiagram`。

对端落在未 ingest 仓 → 提升为 partial 契约并在 coverage 记待接合边;本该有却没搜到 → 相关段 `confidence: low` + 精确搜索证据 + 缺口进 `自查报告.md`。
```

- [ ] **Step 5: 写 data-structures.md**

```markdown
# data-structures — 数据结构提升与视图接线

产出:`repos/{repo}/flows/{topic}/数据结构.md`(不适用则在 `自查报告.md` 写明)。处理完后 `pipeline done data-structures --repo {repo} --pipeline deep-analysis`。

把深挖中浮现的可复用知识提升到正确视图层:

1. 数据结构:完整字段定义提升/同步到 `repos/{repo}/data-models.md`(加反向链)。本文件不重抄完整定义,只持有本流程的:生命周期(谁构造→传递→消费→销毁)、被读/改的字段及含义、继承/组合/嵌套关系。
2. 业务域:识别真实业务域,`global/domains/{域}.md` 不存在则 `scaffold domain` 新建;已存在只追加最小反向链与新证据。
3. 用例视图:本流程若是跨模块/跨仓端到端场景或编排多 flow/contract,新增或接线 `global/use-cases/{用例}.md`;单仓技术流程不强行建用例页。
4. 双链闭环:flow↔domain、flow↔use-case、flow↔contract、flow↔data-model 双向可达。证据不足不新建正式页,在 `自查报告.md` 记候选与 `confidence: low` 原因。
```

- [ ] **Step 6: 写 self-check.md**

```markdown
# self-check — 自查补漏与链接

产出:`repos/{repo}/flows/{topic}/自查报告.md`。deep-analysis 的完成门槛。

逐条检查:
- 调用树每个函数都覆盖;每条分支覆盖(默认/else/错误/边界),关键分支完整分析或以证据列为低置信缺口。
- 独立成文件的分支页与 `主干流程.md`/`调用树.md` 双链闭环,嵌套分支父子双向。
- 每个消息/协议/事件/topic/socket/RPC/TLV 边界有已追踪的接收方/调用方,或显式低置信缺口。
- 数据流从输入到输出连续;payload 字段在有代码证据时从生产源追到接收消费,发送/接收两侧逻辑都分析。
- 提升到 `global/domains/`、`global/use-cases/`、`global/contracts/`、`data-models.md` 的都加了反向链;任何 `status: partial` 契约都在 coverage 待接合边表有记录。
- 每条正文 wikilink 指向存在的 KB 页;指向源码文件或不存在的页即非法,改成 `sources`/inline 引用或正确页链接。

append `log.md`:分析主题、入口、生成文件、覆盖的跨边界、提升的域/用例/契约/结构、剩余低置信区域。
```

- [ ] **Step 7: 校验 + 提交**

Run: `node --test using-obsidian/scripts/lib/registry.test.mjs using-obsidian/scripts/lib/pipeline.test.mjs`
Expected: PASS

```bash
git add obsidian-kb-authoring/pipelines/deep-analysis
git commit -m "docs: deep-analysis 6 个 stage instruction 文件"
```

---

## Phase P4:CLI + describe

### Task 10: cli.mjs 加 pipeline status/next/done 命令

**Files:**
- Modify: `using-obsidian/scripts/lib/cli.mjs`
- Test: `using-obsidian/scripts/obsidian-kb.test.mjs`(追加 CLI 冒烟)

**Interfaces:**
- Consumes: `getPipeline`、`pipelineStatus`、`pipelineNext`、`markStageDone` from `./pipeline.mjs`;`resolveContext`(已有,`context.flags`/`context.positional`/`context.kbRoot`)
- Produces: CLI `pipeline <status|next|done> [--repo R] [--pipeline ingest] [--topic T]`。默认 `--pipeline ingest`。`done` 需 positional stage id。

- [ ] **Step 1: 追加失败测试**

先看 `using-obsidian/scripts/obsidian-kb.test.mjs` 现有的 CLI 调用风格(它用子进程或直接调 `runCli`)。若它用子进程 `execFile('node', [script, ...])`,追加:

```javascript
test('pipeline status runs against a temp kb', async () => {
  const kb = await mkdtemp(path.join(tmpdir(), 'kb-'));
  const { stdout } = await run(['pipeline', 'status', '--repo', 'R', '--kb-root', kb]);
  assert.match(stdout, /terrain/);
});

test('pipeline next returns terrain instruction first', async () => {
  const kb = await mkdtemp(path.join(tmpdir(), 'kb-'));
  const { stdout } = await run(['pipeline', 'next', '--repo', 'R', '--kb-root', kb]);
  assert.match(stdout, /terrain/);
});
```

> 若现有测试用 `runCli` 直接调用(需 mock argv),改为对应风格。先读文件确认 `run`/`runCli` 辅助的确切名字与签名,套用之。

- [ ] **Step 2: 运行确认失败**

Run: `node --test using-obsidian/scripts/obsidian-kb.test.mjs`
Expected: FAIL(未知命令 `pipeline` 走到 usage 分支,无 `terrain` 输出)

- [ ] **Step 3: 实现命令**

在 `using-obsidian/scripts/lib/cli.mjs` 顶部 import 加:

```javascript
import { getPipeline, pipelineStatus, pipelineNext, markStageDone } from './pipeline.mjs';
```

在 `runCli()` 的 `if (command === 'describe')` 分支之后、`printResult({ usage: USAGE })` 之前,插入:

```javascript
  if (command === 'pipeline') {
    const sub = context.positional[0];
    const name = context.flags.pipeline || 'ingest';
    const pipeline = getPipeline(name);
    const ctx = {
      kbRoot: context.kbRoot,
      repo: context.flags.repo,
      topic: context.flags.topic,
      pipelineName: name,
    };
    if (sub === 'status') {
      printResult(await pipelineStatus(pipeline, ctx), context.json);
      return;
    }
    if (sub === 'next') {
      printResult(await pipelineNext(pipeline, ctx), context.json);
      return;
    }
    if (sub === 'done') {
      const stageId = context.positional[1];
      if (!stageId) throw new Error('pipeline done requires a stage id');
      await markStageDone(context.kbRoot, name, stageId);
      printResult({ marked: stageId, pipeline: name }, context.json);
      return;
    }
    throw new Error('pipeline requires a subcommand: status | next | done <stage>');
  }
```

更新 `USAGE` 常量,在 command 列表加 `pipeline`,并追加说明行:

```javascript
  + '  pipeline <status|next|done <stage>> --repo <r> [--pipeline ingest|deep-analysis] [--topic <t>]';
```

（把 `USAGE` 第一行的 `<resolve|init|...|describe>` 改成 `<resolve|init|...|describe|pipeline>`。）

- [ ] **Step 4: 运行确认通过**

Run: `node --test using-obsidian/scripts/obsidian-kb.test.mjs`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add using-obsidian/scripts/lib/cli.mjs using-obsidian/scripts/obsidian-kb.test.mjs
git commit -m "feat: CLI pipeline status/next/done 命令"
```

---

### Task 11: describe pipeline section

**Files:**
- Modify: `using-obsidian/scripts/lib/describe.mjs`
- Test: `using-obsidian/scripts/lib/describe.test.mjs`(追加)

**Interfaces:**
- Consumes: `loadRegistry().pipelines`
- Produces: `describeData().pipelines`(数组:`[{ name, stages: [{ id, requires, produces }] }]`);`describe({ section: 'pipeline' })` 打印人读表。`SECTIONS` 加 `'pipeline'`。

- [ ] **Step 1: 追加失败测试**

在 `describe.test.mjs` 追加:

```javascript
test('describeData exposes pipelines with stage ids', () => {
  const d = describeData();
  const ingest = d.pipelines.find((p) => p.name === 'ingest');
  assert.ok(ingest);
  assert.ok(ingest.stages.some((s) => s.id === 'terrain'));
});

test('describe prints pipeline section', () => {
  const out = describe({ section: 'pipeline' });
  assert.match(out, /ingest/);
  assert.match(out, /terrain/);
});
```

- [ ] **Step 2: 运行确认失败**

Run: `node --test using-obsidian/scripts/lib/describe.test.mjs`
Expected: FAIL(`d.pipelines is undefined`)

- [ ] **Step 3: 实现**

在 `describe.mjs` 加函数:

```javascript
function pipelinesView() {
  const pipelines = loadRegistry().pipelines || {};
  return Object.entries(pipelines).map(([name, def]) => ({
    name,
    description: def.description || '',
    stages: def.stages.map((s) => ({ id: s.id, requires: s.requires || [], produces: s.produces || [] })),
  }));
}
```

在 `describeData()` 返回对象加 `pipelines: pipelinesView()`。

`SECTIONS` 常量改为 `['types', 'views', 'shapes', 'tree', 'pipeline']`。

在 `humanSection(name)` 的 `if (name === 'tree')` 之后加:

```javascript
  if (name === 'pipeline') {
    const blocks = pipelinesView().map((p) => {
      const rows = p.stages.map((s) => `| \`${s.id}\` | ${(s.requires).join(', ') || '—'} | ${(s.produces).join(', ') || '—'} |`).join('\n');
      return `## ${p.name} — ${p.description}\n| stage | requires | produces |\n|---|---|---|\n${rows}`;
    }).join('\n\n');
    return `# 流程编排(来自 pipelines.*)\n${blocks}`;
  }
```

- [ ] **Step 4: 运行确认通过**

Run: `node --test using-obsidian/scripts/lib/describe.test.mjs`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add using-obsidian/scripts/lib/describe.mjs using-obsidian/scripts/lib/describe.test.mjs
git commit -m "feat: describe pipeline section"
```

---

## Phase P5:SKILL 塌缩

### Task 12: ingest/SKILL.md 塌成薄执行器

**Files:**
- Modify: `obsidian-kb-ingest/SKILL.md`(整体重写正文,保留 frontmatter)

**Interfaces:** 无代码接口。保留 frontmatter 的 `name`/`description` 不变;正文塌缩。

- [ ] **Step 1: 重写 SKILL.md**

保留原 frontmatter(第 1-4 行的 `---`/`name`/`description`/`---`),正文替换为:

````markdown
# Obsidian KB Ingest

首次仓库分析。目标:先建有用的广度,再补聚焦的深度。

**始终配合 `obsidian-kb-authoring` 写笔记。** 目录、frontmatter、页面形状、链接契约全部以 authoring 的 `references/` 为准。**阶段编排不在本文描述**——由 `obsidian-kb-authoring/registry.yaml` 的 `pipelines.ingest` 定义,每个阶段的指导在 `obsidian-kb-authoring/pipelines/ingest/*.md`。

## 执行循环

用 helper 驱动(命令清单见 `using-obsidian`):

1. `pipeline status --repo {repo}` 看进度(每个 stage:done / ready / blocked)。
2. `pipeline next --repo {repo}` 拿下一个 ready stage + 它的 instruction 正文。
3. 按 instruction 用 authoring/references 写页——优先 `scaffold {type}` 拿骨架再填。
4. 无产物的自查型 stage(supplements / domains-contracts / backlinks)处理完后 `pipeline done {stage} --repo {repo}` 标记完成。
5. 回到第 1 步,直到 `status` 全部 done。

`deep-dive` 是最后一个 stage:对 `candidate-flow.md` 每条流程串行调 `obsidian-kb-deep-analysis`(优先专职子 agent,一次一个,不并行),每完成一条把该行状态翻 `已深挖`;表全绿本阶段才完成。详见 `pipelines/ingest/deep-dive.md`。

## `{kb-root}` 解析

见 authoring `references/kb-root-resolution.md`。仅当源仓库根或摄入范围无法推断时才询问,永不问 `{kb-root}` 放哪。

## 质量底线

- 代码与 README 冲突时以代码为准。
- 业务流程发现不止步于地形扫描;识别到的所有流程都记入 `candidate-flow.md`。
- 入口或依赖不清时标 `confidence: low`,不编造行为。
- 首扫幂等:对未变源码重跑产生等价笔记。
- 保留人工编辑:合并而非覆盖。
````

- [ ] **Step 2: 校验无回退**

Run: `node --test using-obsidian/scripts/lib/*.test.mjs using-obsidian/scripts/*.test.mjs`
Expected: PASS(SKILL 是文档,不影响测试;确认全绿)

- [ ] **Step 3: 提交**

```bash
git add obsidian-kb-ingest/SKILL.md
git commit -m "refactor: ingest SKILL 塌成薄执行器,阶段编排移交 pipelines"
```

---

### Task 13: deep-analysis/SKILL.md 塌成薄执行器

**Files:**
- Modify: `obsidian-kb-deep-analysis/SKILL.md`(整体重写正文,保留 frontmatter)

- [ ] **Step 1: 重写 SKILL.md**

保留原 frontmatter,正文替换为:

````markdown
# Obsidian KB Deep Analysis

针对单个函数/流程的详尽追踪,比普通流程文档严格得多。

**始终配合 `obsidian-kb-authoring` 写笔记。** frontmatter、页面形状、目录、链接契约以 authoring 的 `references/` 为准。**阶段编排不在本文描述**——由 `registry.yaml` 的 `pipelines.deep-analysis` 定义,各阶段指导在 `obsidian-kb-authoring/pipelines/deep-analysis/*.md`。

## 输出位置

```text
repos/{repo}/flows/{分析主题}/
├── 调用树.md
├── 主干流程.md
├── {分支主题}.md
├── 跨边界数据流.md
├── 数据结构.md
└── 自查报告.md
```

先 `scaffold flow --repo {repo} --topic {主题}` 一次拿全 6 件套骨架再填。

## 执行循环

1. `pipeline next --repo {repo} --pipeline deep-analysis --topic {主题}` 拿下一个 ready stage + instruction。
2. 按 instruction 追踪源码、写对应页。
3. 无产物的自查型 stage(branches / cross-boundary / data-structures)处理完后 `pipeline done {stage} --repo {repo} --pipeline deep-analysis` 标记。
4. 回到第 1 步,直到 `pipeline status --pipeline deep-analysis` 全绿。

- 默认连续跑完所有 stage,phase 间不暂停(除非用户显式要求逐步评审)。
- 每个 stage 独立落盘后再进下一个,保证部分结果可检视、可恢复。
- 跨消息追踪默认扫描整个 workspace;除非用户显式限定范围,不要把下游 handler 发现局限在当前仓库。

## 完成判据

文件夹必须含 `调用树.md`、`主干流程.md`、`自查报告.md`;`跨边界数据流.md`/`数据结构.md`/`{分支主题}.md` 按适用性产出,不适用时在 `自查报告.md` 写明原因(不静默省略)。
````

- [ ] **Step 2: 校验无回退**

Run: `node --test using-obsidian/scripts/lib/*.test.mjs using-obsidian/scripts/*.test.mjs`
Expected: PASS

- [ ] **Step 3: 提交**

```bash
git add obsidian-kb-deep-analysis/SKILL.md
git commit -m "refactor: deep-analysis SKILL 塌成薄执行器"
```

---

## Phase P6:去冗余收尾 + 全链路冒烟

### Task 14: using-obsidian 补 pipeline 命令清单 + .gitignore 状态目录

**Files:**
- Modify: `using-obsidian/SKILL.md`(Helper Commands 段补 pipeline)
- Modify: `using-obsidian/scripts/README.md`(Commands 段补 pipeline)
- Modify: `.gitignore`(确认 KB 侧状态不入 skill 仓库——本仓不含 KB,无需改;但若生成物可能落在仓库内,加 `.obsidian-kb/`)

- [ ] **Step 1: 在 using-obsidian/SKILL.md 的 Helper Commands 代码块追加**

在 `# 其余：init / lint / links / search / report ...` 行之前插入:

```bash
# 流程编排(ingest / deep-analysis 阶段驱动)
node {…}/scripts/obsidian-kb.mjs pipeline status --repo {repo} --kb-root {kb-root}
node {…}/scripts/obsidian-kb.mjs pipeline next --repo {repo} --kb-root {kb-root}
node {…}/scripts/obsidian-kb.mjs pipeline done {stage} --repo {repo} --kb-root {kb-root}
node {…}/scripts/obsidian-kb.mjs pipeline next --repo {repo} --pipeline deep-analysis --topic {主题} --kb-root {kb-root}
```

- [ ] **Step 2: 在 using-obsidian/scripts/README.md 的 Commands 代码块追加**

```bash
node skills/using-obsidian/scripts/obsidian-kb.mjs pipeline status --repo R --kb-root code-kb
node skills/using-obsidian/scripts/obsidian-kb.mjs pipeline next --repo R --kb-root code-kb --json
node skills/using-obsidian/scripts/obsidian-kb.mjs describe pipeline
```

并在「结构单一来源」段补一句:「流程编排的唯一来源是 `registry.yaml` 的 `pipelines:`,阶段指导在 `authoring/pipelines/*.md`;`pipeline status/next` 从中派生执行。」

- [ ] **Step 3: 提交**

```bash
git add using-obsidian/SKILL.md using-obsidian/scripts/README.md .gitignore
git commit -m "docs: using-obsidian 补 pipeline 命令清单"
```

---

### Task 15: 全链路冒烟测试

**Files:**
- Test: `using-obsidian/scripts/obsidian-kb.test.mjs`(追加端到端冒烟)

**Interfaces:**
- Consumes: CLI(子进程或 runCli)、`init`、`scaffold`、`pipeline status/next/done`

- [ ] **Step 1: 追加冒烟测试**

在 `obsidian-kb.test.mjs` 追加(套用文件现有的 `run` 辅助):

```javascript
test('smoke: init → scaffold terrain pages → pipeline status advances', async () => {
  const kb = await mkdtemp(path.join(tmpdir(), 'kb-'));
  await run(['init', '--kb-root', kb]);

  // terrain 未做:status 里 terrain=ready,submodules=blocked
  const before = await run(['pipeline', 'status', '--repo', 'R', '--kb-root', kb, '--json']);
  const st1 = JSON.parse(before.stdout);
  assert.equal(st1.find((s) => s.id === 'terrain').state, 'ready');
  assert.equal(st1.find((s) => s.id === 'submodules').state, 'blocked');

  // 生成 terrain 两页(scaffold + 去掉占位:写入无 <!-- 填 --> 的正文)
  await run(['scaffold', 'overview', '--repo', 'R', '--title', 'R', '--kb-root', kb, '--force']);
  await run(['scaffold', 'architecture', '--repo', 'R', '--title', 'R', '--kb-root', kb, '--force']);
  await stripPlaceholders(path.join(kb, 'repos/R/overview.md'));
  await stripPlaceholders(path.join(kb, 'repos/R/architecture.md'));

  const after = await run(['pipeline', 'status', '--repo', 'R', '--kb-root', kb, '--json']);
  const st2 = JSON.parse(after.stdout);
  assert.equal(st2.find((s) => s.id === 'terrain').state, 'done');
  assert.equal(st2.find((s) => s.id === 'submodules').state, 'ready');

  // self-report stage 标记
  await run(['pipeline', 'done', 'supplements', '--repo', 'R', '--kb-root', kb]);
  const st3 = JSON.parse((await run(['pipeline', 'status', '--repo', 'R', '--kb-root', kb, '--json'])).stdout);
  assert.equal(st3.find((s) => s.id === 'supplements').state, 'done');
});
```

在文件顶部辅助区加(若无 `stripPlaceholders`):

```javascript
import { readFile as _rf, writeFile as _wf } from 'node:fs/promises';
async function stripPlaceholders(file) {
  const t = await _rf(file, 'utf8');
  await _wf(file, t.replace(/<!--\s*填[\s\S]*?-->/g, '已填'), 'utf8');
}
```

- [ ] **Step 2: 运行确认通过**

Run: `node --test using-obsidian/scripts/obsidian-kb.test.mjs`
Expected: PASS

- [ ] **Step 3: 全量测试确认零回退**

Run: `node --test using-obsidian/scripts/lib/*.test.mjs using-obsidian/scripts/*.test.mjs`
Expected: PASS(所有现有 + 新增测试全绿)

- [ ] **Step 4: 提交**

```bash
git add using-obsidian/scripts/obsidian-kb.test.mjs
git commit -m "test: pipeline 全链路冒烟(init→scaffold→status/next/done)"
```

---

## 完成判据

- 全部 15 个 task 的测试通过;`node --test using-obsidian/scripts/lib/*.test.mjs using-obsidian/scripts/*.test.mjs` 全绿。
- `registry.yaml` 有 `pipelines.ingest`(8 stage)+ `pipelines.deep-analysis`(6 stage),每个 stage 的 instruction 文件存在。
- `pipeline status/next/done` 三命令可用;`describe pipeline` 打印阶段表。
- ingest/deep-analysis 两个 SKILL.md 塌成薄执行器,不再复述阶段细节与 authoring 约束。
- 现有测试零回退,现有 `types:`/scaffold/lint 行为不变。
