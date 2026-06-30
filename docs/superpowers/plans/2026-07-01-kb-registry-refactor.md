# 知识工程重构（中央注册表 + 聚焦模板）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把"一个页型的结构事实"从散写在约 10 处（代码 + prose）收敛为两层单一来源——维护者持 `registry.yaml`，团队各持 `templates/*.template.md`——代码全数据驱动、参考文档从注册表生成。

**Architecture:** 新增一个仅服务注册表的小型嵌套 YAML 解析器 `lib/yaml.mjs` 与注册表加载器 `lib/registry.mjs`；现有脚本（template/lint/index-build/init/scaffold）改为从注册表派生，不再硬编码任何页型清单；新增 `lib/generate-docs.mjs` 把四份参考文档的机器事实在 GENERATED 标记间重写。

**Tech Stack:** Node.js（ESM `.mjs`，零运行时依赖），`node:test` 测试，YAML 注册表。

## Global Constraints

- **零新增运行时第三方依赖**：沿用本仓"手搓 YAML 子集"的风格，不引 npm 包。
- **对外 API 与命令签名不变**：`obsidian-kb.mjs` 现有具名导出（含 `REQUIRED_PROPERTIES`/`VALID_TYPES`/`VALID_CONFIDENCE`/`VALID_STATUS`）与现有 CLI 命令必须照旧可用。
- **行为零回退**：现有 22 个测试全程保持绿，**不修改现有测试源**。
- **lint 告警文案与 issue.type 逐字保留**。
- **不改 `frontmatter.mjs` 的 `parseSimpleYaml`**：它服务页面 frontmatter，独立于注册表解析。
- **不落地专家新结构、不改库内页面**：本轮只交付机制 + 迁现有页型。
- **文档 prose 用中文**，代码标识符保持原文。
- **测试命令（基线 22/22 绿）**：`node --test using-obsidian/scripts/lib/*.test.mjs using-obsidian/scripts/*.test.mjs`

---

## 文件结构

| 文件 | 职责 | 任务 |
|---|---|---|
| `using-obsidian/scripts/lib/yaml.mjs` ✨ | 仅服务注册表的最小嵌套 YAML 解析器 | T1 |
| `using-obsidian/scripts/lib/yaml.test.mjs` ✨ | 解析器单测 | T1 |
| `using-obsidian/scripts/lib/registry.mjs` ✨ | 读+校验+派生注册表 | T2 |
| `using-obsidian/scripts/lib/registry.test.mjs` ✨ | 加载器单测 + 迁移黄金对照 | T2/T3 |
| `obsidian-kb-authoring/registry.yaml` ✨ | **结构唯一来源**：每页型 落点/视图/模板/linkage + 通用 schema | T3 |
| `using-obsidian/scripts/lib/template.mjs` | 改读注册表（删 TYPE_FILE/FLOW_FILES/targetPath switch） | T4 |
| `using-obsidian/scripts/lib/lint.mjs` | 改读注册表（schema + 数据化 linkage） | T5 |
| `using-obsidian/scripts/lib/index-build.mjs` | frontmatter 通用解析 | T6 |
| `using-obsidian/scripts/lib/init.mjs` | 读 `schema.initDirs` | T7 |
| `using-obsidian/scripts/lib/generate-docs.mjs` ✨ | 四份参考文档 GENERATED 区段生成器 + `--check` | T8–T11 |
| `using-obsidian/scripts/lib/generate-docs.test.mjs` ✨ | 生成器单测 + 幂等校验 | T8–T11 |
| `using-obsidian/scripts/lib/cli.mjs`、`obsidian-kb.mjs` | 接 `generate-docs` 命令与导出 | T8 |
| 四份 `references/*.md` | 插入 GENERATED 标记 | T8–T11 |
| 各 `SKILL.md`、`README.md` | 指针指向新单一来源 | T12 |

---

## Task 1: 最小嵌套 YAML 解析器 `lib/yaml.mjs`

**Files:**
- Create: `using-obsidian/scripts/lib/yaml.mjs`
- Test: `using-obsidian/scripts/lib/yaml.test.mjs`

**Interfaces:**
- Consumes: `stripQuotes` from `./frontmatter.mjs`
- Produces: `parseYaml(text: string) => object | array | scalar` —— 支持 2 空格缩进嵌套 map、标量（string/null/`~`）、块列表、列表项为 map、内联流式列表 `[a, b]`、`#` 注释、引号剥离。**不支持**锚点/别名/多行块标量（遇非法结构抛 `Error`）。

- [ ] **Step 1: 写失败测试**

```javascript
// using-obsidian/scripts/lib/yaml.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseYaml } from './yaml.mjs';

test('parses nested maps and scalars', () => {
  const doc = parseYaml('a:\n  b: 1\n  c: hello\n');
  assert.deepEqual(doc, { a: { b: '1', c: 'hello' } });
});

test('parses null via null and tilde', () => {
  assert.deepEqual(parseYaml('x: null\ny: ~\n'), { x: null, y: null });
});

test('parses block list of scalars', () => {
  assert.deepEqual(parseYaml('xs:\n  - one\n  - two\n'), { xs: ['one', 'two'] });
});

test('parses inline flow list', () => {
  assert.deepEqual(parseYaml('xs: [a, b, c]\n'), { xs: ['a', 'b', 'c'] });
});

test('parses empty inline list', () => {
  assert.deepEqual(parseYaml('xs: []\n'), { xs: [] });
});

test('parses list of maps with continuation keys', () => {
  const doc = parseYaml('rules:\n  - kind: prefix\n    value: repos/\n    message: hi\n  - kind: contains\n    value: /modules/\n');
  assert.deepEqual(doc, {
    rules: [
      { kind: 'prefix', value: 'repos/', message: 'hi' },
      { kind: 'contains', value: '/modules/' },
    ],
  });
});

test('strips full-line and trailing comments', () => {
  const doc = parseYaml('# header\na: 1   # inline\nb: 2\n');
  assert.deepEqual(doc, { a: '1', b: '2' });
});

test('strips quotes around scalars and list items', () => {
  assert.deepEqual(parseYaml("a: 'x'\nxs: ['/m/']\n"), { a: 'x', xs: ['/m/'] });
});

test('parses deep nesting (types -> type -> linkage)', () => {
  const doc = parseYaml('types:\n  flow:\n    view: runtime\n    linkage:\n      - requireFrontmatter: domain\n        message: m\n');
  assert.deepEqual(doc, {
    types: { flow: { view: 'runtime', linkage: [{ requireFrontmatter: 'domain', message: 'm' }] } },
  });
});

test('throws on a mapping line without colon', () => {
  assert.throws(() => parseYaml('a:\n  bogusline\n'));
});
```

- [ ] **Step 2: 运行确认失败**

Run: `node --test using-obsidian/scripts/lib/yaml.test.mjs`
Expected: FAIL（`Cannot find module './yaml.mjs'`）

- [ ] **Step 3: 实现解析器**

```javascript
// using-obsidian/scripts/lib/yaml.mjs
import { stripQuotes } from './frontmatter.mjs';

function stripComment(line) {
  if (line.trimStart().startsWith('#')) return '';
  const idx = line.indexOf(' #');
  return idx === -1 ? line : line.slice(0, idx);
}

function parseScalar(raw) {
  const v = raw.trim();
  if (v === '') return '';
  if (v === 'null' || v === '~') return null;
  if (v.startsWith('[') && v.endsWith(']')) {
    return v.slice(1, -1).split(',').map((s) => stripQuotes(s.trim())).filter((s) => s.length > 0);
  }
  return stripQuotes(v);
}

export function parseYaml(text) {
  const lines = [];
  for (const rawLine of text.replace(/\r\n/g, '\n').split('\n')) {
    const noComment = stripComment(rawLine);
    if (noComment.trim() === '') continue;
    const indent = noComment.length - noComment.trimStart().length;
    lines.push({ indent, content: noComment.trim() });
  }
  let i = 0;

  function keyValue(content) {
    const m = content.match(/^([^:]+):\s*(.*)$/);
    if (!m) throw new Error(`Invalid YAML mapping line: ${content}`);
    return { key: m[1].trim(), rest: m[2] };
  }

  function parseValue(rest, ownerIndent) {
    if (rest !== '') return parseScalar(rest);
    if (i < lines.length && lines[i].indent > ownerIndent) return parseBlock(lines[i].indent);
    return null;
  }

  function parseMapping(indent) {
    const map = {};
    while (i < lines.length && lines[i].indent === indent && !lines[i].content.startsWith('- ')) {
      const { key, rest } = keyValue(lines[i].content);
      i += 1;
      map[key] = parseValue(rest, indent);
    }
    return map;
  }

  function parseSequence(indent) {
    const arr = [];
    while (i < lines.length && lines[i].indent === indent && lines[i].content.startsWith('- ')) {
      const after = lines[i].content.slice(2);
      if (/^[^:]+:\s*/.test(after) && !after.startsWith('[')) {
        const innerIndent = indent + 2;
        const item = {};
        const { key, rest } = keyValue(after);
        i += 1;
        item[key] = parseValue(rest, innerIndent);
        while (i < lines.length && lines[i].indent === innerIndent && !lines[i].content.startsWith('- ')) {
          const kv = keyValue(lines[i].content);
          i += 1;
          item[kv.key] = parseValue(kv.rest, innerIndent);
        }
        arr.push(item);
      } else {
        arr.push(parseScalar(after));
        i += 1;
      }
    }
    return arr;
  }

  function parseBlock(indent) {
    if (i >= lines.length) return null;
    return lines[i].content.startsWith('- ') ? parseSequence(indent) : parseMapping(indent);
  }

  return parseBlock(0);
}
```

- [ ] **Step 4: 运行确认通过**

Run: `node --test using-obsidian/scripts/lib/yaml.test.mjs`
Expected: PASS（全部 10 个用例）

- [ ] **Step 5: 提交**

```bash
git add using-obsidian/scripts/lib/yaml.mjs using-obsidian/scripts/lib/yaml.test.mjs
git commit -m "feat(kb): 最小嵌套 YAML 解析器(仅服务注册表)"
```

---

## Task 2: 注册表加载器 `lib/registry.mjs`

**Files:**
- Create: `using-obsidian/scripts/lib/registry.mjs`
- Test: `using-obsidian/scripts/lib/registry.test.mjs`（本任务先用临时 fixture 测机制，T3 再加真实注册表的黄金对照）

**Interfaces:**
- Consumes: `parseYaml` from `./yaml.mjs`
- Produces:
  - `loadRegistry({ force?, file? }) => { schema, types }`（默认读 `obsidian-kb-authoring/registry.yaml`；`file` 仅供测试覆盖；校验失败抛 `Error`）
  - `templatesDir() => string`、`registryPath() => string`
  - `allTypes() => string[]`（全部 scaffold 标识键）
  - `validTypes() => Set<string>`（canonical 枚举：`enumType ?? key` 去重）
  - `canonicalTypes() => string[]`（`(enumType ?? key) === key` 的键，保持注册表插入序）
  - `scaffoldableTypes() => string[]`（`template!=null || family!=null` 的键，已排序）
  - `requiredFrontmatter()/validConfidence()/validStatus()/initDirs() => string[]`

- [ ] **Step 1: 写失败测试（机制，用临时 fixture）**

```javascript
// using-obsidian/scripts/lib/registry.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { loadRegistry } from './registry.mjs';

async function fixture(yamlText, templates = ['t']) {
  const root = await mkdtemp(path.join(tmpdir(), 'reg-'));
  await mkdir(path.join(root, 'templates', 'flow'), { recursive: true });
  for (const t of templates) await writeFile(path.join(root, 'templates', `${t}.template.md`), '# t\n');
  const file = path.join(root, 'registry.yaml');
  await writeFile(file, yamlText, 'utf8');
  return file;
}

const GOOD = `schema:
  requiredFrontmatter: [title, type]
  confidence: [high, low]
  status: [active, draft]
  initDirs: [global/x, repos]
types:
  alpha:
    template: t
    target: global/x/{title}.md
    view: logical
  beta:
    template: t
    target: global/x/{title}.md
    view: logical
    enumType: alpha
  meta-only:
    template: null
    target: null
    view: meta
`;

test('loadRegistry parses schema and derives type sets', async () => {
  const file = await fixture(GOOD);
  const reg = loadRegistry({ force: true, file });
  assert.deepEqual(reg.schema.requiredFrontmatter, ['title', 'type']);
});

test('validTypes dedups aliases via enumType', async () => {
  const { validTypes } = await import('./registry.mjs');
  const file = await fixture(GOOD);
  loadRegistry({ force: true, file });
  assert.deepEqual([...validTypes()].sort(), ['alpha', 'meta-only']);
});

test('scaffoldableTypes excludes templateless types', async () => {
  const { scaffoldableTypes } = await import('./registry.mjs');
  const file = await fixture(GOOD);
  loadRegistry({ force: true, file });
  assert.deepEqual(scaffoldableTypes(), ['alpha', 'beta']);
});

test('throws when a type has an invalid view', async () => {
  const bad = GOOD.replace('view: meta', 'view: bogus');
  const file = await fixture(bad);
  assert.throws(() => loadRegistry({ force: true, file }), /invalid view/);
});

test('throws when a template file is missing', async () => {
  const file = await fixture(GOOD, []); // no template files written
  assert.throws(() => loadRegistry({ force: true, file }), /template not found/);
});
```

- [ ] **Step 2: 运行确认失败**

Run: `node --test using-obsidian/scripts/lib/registry.test.mjs`
Expected: FAIL（`Cannot find module './registry.mjs'`）

- [ ] **Step 3: 实现加载器**

```javascript
// using-obsidian/scripts/lib/registry.mjs
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseYaml } from './yaml.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const AUTHORING = path.resolve(HERE, '../../../obsidian-kb-authoring');
const VALID_VIEWS = new Set(['usecase', 'logical', 'development', 'runtime', 'contract', 'meta']);

export function registryPath() { return path.join(AUTHORING, 'registry.yaml'); }
export function templatesDir() { return path.join(AUTHORING, 'templates'); }

let cached = null;

export function loadRegistry({ force = false, file } = {}) {
  if (cached && !force && !file) return cached;
  const reg = parseYaml(readFileSync(file || registryPath(), 'utf8'));
  validate(reg, file);
  if (!file) cached = reg;
  return reg;
}

function templatesDirFor(file) {
  return file ? path.join(path.dirname(file), 'templates') : templatesDir();
}

function validate(reg, file) {
  if (!reg || typeof reg !== 'object') throw new Error('registry: root must be a mapping');
  const { schema, types } = reg;
  if (!schema) throw new Error('registry: missing schema');
  for (const k of ['requiredFrontmatter', 'confidence', 'status', 'initDirs']) {
    if (!Array.isArray(schema[k])) throw new Error(`registry: schema.${k} must be a list`);
  }
  if (!types || typeof types !== 'object') throw new Error('registry: missing types');
  const tdir = templatesDirFor(file);
  for (const [type, def] of Object.entries(types)) {
    if (!def || typeof def !== 'object') throw new Error(`registry: type ${type} must be a mapping`);
    if (!VALID_VIEWS.has(def.view)) throw new Error(`registry: type ${type} invalid view: ${def.view}`);
    if (def.template != null && !existsSync(path.join(tdir, `${def.template}.template.md`))) {
      throw new Error(`registry: type ${type} template not found: ${def.template}`);
    }
    if (def.family != null) {
      if (!Array.isArray(def.members)) throw new Error(`registry: family ${type} needs members list`);
      for (const m of def.members) {
        if (!existsSync(path.join(tdir, def.family, `${m}.template.md`))) {
          throw new Error(`registry: ${type} member template not found: ${def.family}/${m}`);
        }
      }
    }
  }
}

function types() { return loadRegistry().types; }
const canon = (key, def) => def.enumType ?? key;

export function allTypes() { return Object.keys(types()); }
export function validTypes() {
  const t = types();
  return new Set(Object.keys(t).map((k) => canon(k, t[k])));
}
export function canonicalTypes() {
  const t = types();
  return Object.keys(t).filter((k) => canon(k, t[k]) === k);
}
export function scaffoldableTypes() {
  const t = types();
  return Object.keys(t).filter((k) => t[k].template != null || t[k].family != null).sort();
}
export function requiredFrontmatter() { return loadRegistry().schema.requiredFrontmatter; }
export function validConfidence() { return loadRegistry().schema.confidence; }
export function validStatus() { return loadRegistry().schema.status; }
export function initDirs() { return loadRegistry().schema.initDirs; }
```

- [ ] **Step 4: 运行确认通过**

Run: `node --test using-obsidian/scripts/lib/registry.test.mjs`
Expected: PASS（5 个用例）

- [ ] **Step 5: 提交**

```bash
git add using-obsidian/scripts/lib/registry.mjs using-obsidian/scripts/lib/registry.test.mjs
git commit -m "feat(kb): 注册表加载器(读+校验+派生类型集)"
```

---

## Task 3: 编写真实 `registry.yaml` + 迁移黄金对照

**Files:**
- Create: `obsidian-kb-authoring/registry.yaml`
- Modify: `using-obsidian/scripts/lib/registry.test.mjs`（追加黄金对照用例）

**Interfaces:**
- Consumes: T2 的 `loadRegistry/validTypes/scaffoldableTypes/canonicalTypes`
- Produces: 全部现有页型的结构事实（落点/视图/模板/linkage/通用 schema），供 T4–T11 派生

- [ ] **Step 1: 写黄金对照测试（先失败）**

把今天 `template.mjs` 的 `targetPath` switch、`VALID_TYPES`、`listTypes` 输出作为**字面快照**钉死，证明搬运无偏差。

```javascript
// 追加到 using-obsidian/scripts/lib/registry.test.mjs
import { loadRegistry as _real, validTypes as _vt, scaffoldableTypes as _st } from './registry.mjs';
import { targetPath } from './template.mjs';

// 旧 VALID_TYPES（lint.mjs 迁移前的 18 个 canonical）
const OLD_VALID = ['use-case', 'domain', 'glossary', 'flow', 'candidate', 'contract', 'module',
  'architecture', 'api-surface', 'data-model', 'config', 'implementation', 'runtime-notes',
  'risk', 'index', 'log', 'coverage', 'extra'];

// 旧 listTypes（TYPE_FILE 键 ∪ flow，排序后）
const OLD_SCAFFOLDABLE = ['api-surface', 'architecture', 'candidate', 'candidate-flow', 'config',
  'contract', 'coverage', 'data-model', 'data-models', 'domain', 'extra', 'flow', 'glossary',
  'implementation', 'key-implementations', 'module', 'runtime-notes', 'system-architecture',
  'use-case'].sort();

// 旧 targetPath 每分支的字面期望（占位用固定实参）
const TARGET_GOLDEN = {
  'use-case': ['global/use-cases/T.md', { title: 'T' }],
  domain: ['global/domains/T.md', { title: 'T' }],
  contract: ['global/contracts/T.md', { title: 'T' }],
  coverage: ['global/architecture/coverage.md', {}],
  module: ['repos/R/modules/T.md', { repo: 'R', title: 'T' }],
  architecture: ['repos/R/architecture.md', { repo: 'R' }],
  'system-architecture': ['global/architecture/system-architecture.md', {}],
  candidate: ['repos/R/candidate-flow.md', { repo: 'R' }],
  'candidate-flow': ['repos/R/candidate-flow.md', { repo: 'R' }],
  glossary: ['repos/R/glossary.md', { repo: 'R' }],
  'api-surface': ['repos/R/api-surface.md', { repo: 'R' }],
  'data-model': ['repos/R/data-models.md', { repo: 'R' }],
  'data-models': ['repos/R/data-models.md', { repo: 'R' }],
  config: ['repos/R/config-and-env.md', { repo: 'R' }],
  'runtime-notes': ['repos/R/runtime-notes.md', { repo: 'R' }],
  implementation: ['repos/R/key-implementations.md', { repo: 'R' }],
  'key-implementations': ['repos/R/key-implementations.md', { repo: 'R' }],
  extra: ['global/extra/T.md', { title: 'T' }],
  flow: ['repos/R/flows/TOPIC/主干流程.md', { repo: 'R', topic: 'TOPIC', flowFile: '主干流程' }],
};

test('GOLDEN: real registry loads and validates', () => {
  _real({ force: true });
});

test('GOLDEN: validTypes equals old VALID_TYPES', () => {
  _real({ force: true });
  assert.deepEqual([..._vt()].sort(), [...OLD_VALID].sort());
});

test('GOLDEN: scaffoldableTypes equals old listTypes', () => {
  _real({ force: true });
  assert.deepEqual(_st(), OLD_SCAFFOLDABLE);
});

test('GOLDEN: targetPath matches old switch for every scaffold id', () => {
  _real({ force: true });
  for (const [type, [expected, args]] of Object.entries(TARGET_GOLDEN)) {
    assert.equal(targetPath(type, args), expected, `targetPath(${type})`);
  }
});
```

> 注：此 4 个用例引用 `template.mjs` 的 `targetPath`，在 T4 改写后由注册表派生——黄金期望是**字面量**，因此 T4 之后仍是真正的回归守护（非自指）。本任务先让前三个（不依赖 targetPath 字面对照的 load/validTypes/scaffoldable）通过；`targetPath` 对照在 T4 完成后转绿，本任务里它会因旧 switch 与新注册表一致而**已经**通过。

- [ ] **Step 2: 运行确认失败**

Run: `node --test using-obsidian/scripts/lib/registry.test.mjs`
Expected: FAIL（`registry.yaml` 不存在 → `loadRegistry` 抛错）

- [ ] **Step 3: 编写 `registry.yaml`（誊入全部页型）**

```yaml
# obsidian-kb-authoring/registry.yaml
# 结构唯一来源。维护者维护本文件；团队只维护 templates/*.template.md。
# 改落点/视图/lint/枚举 → 改这里一处，然后 `node obsidian-kb.mjs generate-docs` 同步参考文档。
schema:
  requiredFrontmatter: [title, type, repo, created, updated, confidence, status, sources]
  confidence: [high, medium, low]
  status: [active, partial, draft, deprecated]
  # init 预建目录的显式单一来源（从 init.mjs 搬来）。
  # global/extra 与仓内子目录有意不在其中（延续 init 不预建 extra 的约定）。
  initDirs: [global/use-cases, global/domains, global/contracts, global/architecture, repos]

types:
  use-case:
    template: use-case
    target: global/use-cases/{title}.md
    view: usecase
    summary: 跨仓端到端业务场景，编排 + 链接为主
  domain:
    template: domain
    target: global/domains/{title}.md
    view: logical
    summary: 业务域概念字典
  glossary:
    template: glossary
    target: repos/{repo}/glossary.md
    view: logical
    summary: 仓内术语→链接索引
  contract:
    template: contract
    target: global/contracts/{title}.md
    view: contract
    summary: 跨边界契约，定义一次被多 flow 引用
    linkage:
      - linkPrefixAny: [repos/]
        issueType: contract-linkage
        message: Contract page should link producer or consumer repo/module pages
  module:
    template: module
    target: repos/{repo}/modules/{title}.md
    view: development
    summary: 单模块职责 + 依赖
  architecture:
    template: architecture
    target: repos/{repo}/architecture.md
    view: logical
    summary: 仓库逻辑视图 + 路由 + 架构图
  system-architecture:
    template: architecture
    target: global/architecture/system-architecture.md
    view: logical
    enumType: architecture
    summary: 工作区唯一人工叙事总览（复用 architecture 模板）
  api-surface:
    template: api-surface
    target: repos/{repo}/api-surface.md
    view: contract
    summary: 仓内对外接口面
  data-model:
    template: data-models
    target: repos/{repo}/data-models.md
    view: development
    summary: 仓内核心数据结构
  data-models:
    template: data-models
    target: repos/{repo}/data-models.md
    view: development
    enumType: data-model
    summary: data-model 的文件名别名
  config:
    template: config
    target: repos/{repo}/config-and-env.md
    view: development
    summary: 仓内配置与环境
  implementation:
    template: key-implementations
    target: repos/{repo}/key-implementations.md
    view: development
    summary: 仓内关键实现点
  key-implementations:
    template: key-implementations
    target: repos/{repo}/key-implementations.md
    view: development
    enumType: implementation
    summary: implementation 的文件名别名
  runtime-notes:
    template: runtime-notes
    target: repos/{repo}/runtime-notes.md
    view: runtime
    summary: 仓内运行注记（错误/重试/陷阱）
  candidate:
    template: candidate-flow
    target: repos/{repo}/candidate-flow.md
    view: runtime
    summary: 全量已识别流程清单（自动深挖进度）
  candidate-flow:
    template: candidate-flow
    target: repos/{repo}/candidate-flow.md
    view: runtime
    enumType: candidate
    summary: candidate 的文件名别名
  coverage:
    template: coverage
    target: global/architecture/coverage.md
    view: meta
    summary: 工作区覆盖记录（唯一、只追加）
  extra:
    template: extra
    target: global/extra/{title}.md
    view: meta
    summary: 不属于标准页型的补充页
  flow:
    template: null
    family: flow
    target: repos/{repo}/flows/{topic}/{member}.md
    view: runtime
    summary: deep-analysis 深流程产物，一文件夹六件
    members: [调用树, 主干流程, 分支主题, 跨边界数据流, 数据结构, 自查报告]
    linkage:
      - requireFrontmatter: domain
        issueType: flow-linkage
        message: Flow page is missing domain metadata
      - linkPrefixAny: [global/contracts/]
        linkContainsAny: ['/modules/']
        issueType: flow-linkage
        message: Flow page should link related contracts or modules
  risk:
    template: null
    target: null
    view: runtime
  index:
    template: null
    target: null
    view: meta
  log:
    template: null
    target: null
    view: meta
```

- [ ] **Step 4: 运行确认通过**

Run: `node --test using-obsidian/scripts/lib/registry.test.mjs`
Expected: PASS（含 4 个 GOLDEN 用例；`targetPath` 对照此刻走旧 switch，与注册表一致即通过）

- [ ] **Step 5: 提交**

```bash
git add obsidian-kb-authoring/registry.yaml using-obsidian/scripts/lib/registry.test.mjs
git commit -m "feat(kb): 编写 registry.yaml(全部页型) + 迁移黄金对照"
```

---

## Task 4: `template.mjs` 改读注册表

**Files:**
- Modify: `using-obsidian/scripts/lib/template.mjs`（整文件重写，对外签名不变）
- Test: 复用 `template.test.mjs`、`scaffold.test.mjs`、`registry.test.mjs` 的 GOLDEN `targetPath`

**Interfaces:**
- Consumes: `loadRegistry`、`templatesDir` from `./registry.mjs`
- Produces（签名全不变）：`templatesDir()`、`loadTemplate(type, flowFile)`、`fillMechanical(text, opts)`、`requiredSections(type, flowFile)`、`targetPath(type, opts)`、具名导出 `FLOW_FILES`、`TYPE_FILE`（改为注册表派生的等价值）

- [ ] **Step 1: 运行现有测试，确认基线绿**

Run: `node --test using-obsidian/scripts/lib/template.test.mjs using-obsidian/scripts/lib/scaffold.test.mjs`
Expected: PASS

- [ ] **Step 2: 重写 `template.mjs`**

```javascript
// using-obsidian/scripts/lib/template.mjs
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { loadRegistry, templatesDir } from './registry.mjs';

export { templatesDir };

function typeDef(type) {
  const def = loadRegistry().types[type];
  if (!def) throw new Error(`未知页型: ${type}`);
  return def;
}

export function loadTemplate(type, flowFile) {
  if (type === 'flow') {
    if (!flowFile) throw new Error('flow 需指定 flowFile');
    return readFileSync(path.join(templatesDir(), 'flow', `${flowFile}.template.md`), 'utf8');
  }
  const def = typeDef(type);
  if (!def.template) throw new Error(`页型无模板: ${type}`);
  return readFileSync(path.join(templatesDir(), `${def.template}.template.md`), 'utf8');
}

export function fillMechanical(text, { title = '', repo = '', date }) {
  const d = date || new Date().toISOString().slice(0, 10);
  return text
    .replaceAll('{{title}}', title)
    .replaceAll('{{repo}}', repo)
    .replaceAll('{{created}}', d)
    .replaceAll('{{updated}}', d);
}

export function requiredSections(type, flowFile) {
  const text = loadTemplate(type, flowFile);
  const lines = text.split('\n');
  const out = [];
  for (let i = 0; i < lines.length; i += 1) {
    const m = lines[i].match(/^##\s+(.+?)\s*$/);
    if (!m) continue;
    if (/optional/i.test(lines[i]) || /<!--\s*optional/i.test(lines[i + 1] || '')) continue;
    out.push(m[1].trim());
  }
  return out;
}

export function targetPath(type, { repo, title, topic, flowFile } = {}) {
  const def = typeDef(type);
  if (!def.target) throw new Error(`页型无落点: ${type}`);
  return def.target
    .replaceAll('{repo}', repo ?? '')
    .replaceAll('{title}', title ?? '')
    .replaceAll('{topic}', topic ?? '')
    .replaceAll('{member}', flowFile ?? '');
}

// 兼容旧具名导出：从注册表派生。
const reg = loadRegistry();
export const FLOW_FILES = reg.types.flow.members;
export const TYPE_FILE = Object.fromEntries(
  Object.entries(reg.types).filter(([, d]) => d.template).map(([k, d]) => [k, d.template]),
);
```

- [ ] **Step 3: 运行全部受影响测试**

Run: `node --test using-obsidian/scripts/lib/template.test.mjs using-obsidian/scripts/lib/scaffold.test.mjs using-obsidian/scripts/lib/registry.test.mjs`
Expected: PASS（含 `targetPath` GOLDEN——现在由注册表派生，仍与字面快照一致）

- [ ] **Step 4: 跑全量套件确认零回退**

Run: `node --test using-obsidian/scripts/lib/*.test.mjs using-obsidian/scripts/*.test.mjs`
Expected: PASS（全绿）

- [ ] **Step 5: 提交**

```bash
git add using-obsidian/scripts/lib/template.mjs
git commit -m "refactor(kb): template.mjs 改读注册表(删 TYPE_FILE/FLOW_FILES/targetPath 硬编码)"
```

---

## Task 5: `lint.mjs` 改读注册表（schema + 数据化 linkage）

**Files:**
- Modify: `using-obsidian/scripts/lib/lint.mjs`
- Test: 复用 `obsidian-kb.test.mjs`（含 `Invalid type`、缺必填、模板 section、orphan 等）

**Interfaces:**
- Consumes: `validTypes`、`requiredFrontmatter`、`validConfidence`、`validStatus`、`loadRegistry` from `./registry.mjs`
- Produces（签名不变）：`REQUIRED_PROPERTIES`、`VALID_TYPES`、`VALID_CONFIDENCE`、`VALID_STATUS`、`lintKnowledgeBase({ kbRoot })`

- [ ] **Step 1: 运行现有 lint 相关测试，确认基线绿**

Run: `node --test using-obsidian/scripts/obsidian-kb.test.mjs`
Expected: PASS

- [ ] **Step 2: 改写 `lint.mjs` 顶部常量与 linkage 段**

把常量改为注册表派生：

```javascript
// 替换 lint.mjs 顶部 import 与常量定义
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { buildIndex } from './index-build.mjs';
import { normalizeTarget, parseFrontmatter, arrayValue } from './frontmatter.mjs';
import { requiredSections } from './template.mjs';
import {
  loadRegistry, requiredFrontmatter, validTypes, validConfidence, validStatus,
} from './registry.mjs';

// 枚举/字段的唯一权威定义是 obsidian-kb-authoring/registry.yaml；以下为其投影。
export const REQUIRED_PROPERTIES = requiredFrontmatter();
export const VALID_TYPES = validTypes();
export const VALID_CONFIDENCE = new Set(validConfidence());
export const VALID_STATUS = new Set(validStatus());
```

把今天硬编码的 flow/contract linkage 段（`if (page.type === 'flow') {...}` 与 `if (page.type === 'contract') {...}`）整体替换为数据驱动循环：

```javascript
    // 数据化 linkage：遍历 registry 中该型的规则，任一匹配子命中即通过。
    const def = loadRegistry().types[page.type];
    if (def && Array.isArray(def.linkage)) {
      for (const rule of def.linkage) {
        let pass = false;
        if (rule.requireFrontmatter) {
          pass = arrayValue(page[rule.requireFrontmatter]).length > 0;
        }
        if (!pass && Array.isArray(rule.linkPrefixAny)) {
          pass = page.outgoingLinks.some((l) => rule.linkPrefixAny.some((p) => l.startsWith(p)));
        }
        if (!pass && Array.isArray(rule.linkContainsAny)) {
          pass = page.outgoingLinks.some((l) => rule.linkContainsAny.some((c) => l.includes(c)));
        }
        if (!pass) {
          issues.push({
            severity: 'warning',
            type: rule.issueType || 'linkage',
            page: page.relativePath,
            message: rule.message,
          });
        }
      }
    }
```

> `requireFrontmatter: domain` 对 flow 用 `arrayValue(page.domain).length > 0` 判定——与旧 `page.domain.length === 0` 等价（index-build 的 `domain` 始终是数组）。`linkPrefixAny`+`linkContainsAny` 取并集，逐字复刻旧 flow 的 `startsWith('global/contracts/') || includes('/modules/')`；contract 规则仅 `linkPrefixAny: ['repos/']`。

- [ ] **Step 3: 运行确认通过**

Run: `node --test using-obsidian/scripts/obsidian-kb.test.mjs`
Expected: PASS（`Invalid type: unknown-type`、缺 created/updated、模板 section、orphan 等断言不变）

- [ ] **Step 4: 全量套件**

Run: `node --test using-obsidian/scripts/lib/*.test.mjs using-obsidian/scripts/*.test.mjs`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add using-obsidian/scripts/lib/lint.mjs
git commit -m "refactor(kb): lint.mjs 改读注册表(schema 派生 + 数据化 linkage)"
```

---

## Task 6: `index-build.mjs` frontmatter 通用解析

**Files:**
- Modify: `using-obsidian/scripts/lib/index-build.mjs:36-52`
- Test: `using-obsidian/scripts/lib/index-build.test.mjs` ✨（新增 1 个用例证明新关系字段无需改代码即可流通）

**Interfaces:**
- Consumes: 现有 `parseFrontmatter/arrayValue/...`
- Produces: `buildIndex` 返回的 `page` 额外带 `data`（全量 frontmatter）与任意新 frontmatter 键；现有具名字段不变

- [ ] **Step 1: 写失败测试**

```javascript
// using-obsidian/scripts/lib/index-build.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { buildIndex } from './index-build.mjs';

test('buildIndex preserves arbitrary new frontmatter fields without code change', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'idx-'));
  await mkdir(path.join(root, 'global'), { recursive: true });
  await writeFile(path.join(root, 'global', 'p.md'), `---
title: P
type: contract
repo: global
created: 2026-07-01
updated: 2026-07-01
confidence: high
status: active
sources: []
provider:
  - resource-service
---
# P
`, 'utf8');
  const index = await buildIndex({ kbRoot: root, writeIndexes: false });
  const page = index.pages.find((p) => p.relativePath === 'global/p.md');
  assert.deepEqual(page.data.provider, ['resource-service']);
});
```

- [ ] **Step 2: 运行确认失败**

Run: `node --test using-obsidian/scripts/lib/index-build.test.mjs`
Expected: FAIL（`page.data` 为 undefined）

- [ ] **Step 3: 改 `index-build.mjs` 的 page 构造**

把 `const page = { ... }` 改为先铺展全量 frontmatter，再用规范化命名字段覆盖，并附 `data`：

```javascript
    const page = {
      ...parsed.data,
      relativePath,
      title: parsed.data.title || path.basename(relativePath, '.md'),
      type: parsed.data.type || '',
      repo: parsed.data.repo || '',
      created: parsed.data.created || '',
      updated: parsed.data.updated || '',
      domain: arrayValue(parsed.data.domain),
      aliases: arrayValue(parsed.data.aliases),
      tags: arrayValue(parsed.data.tags),
      sources: arrayValue(parsed.data.sources),
      confidence: parsed.data.confidence || '',
      status: parsed.data.status || '',
      outgoingLinks: extractWikiLinks(markdown),
      data: parsed.data,
    };
```

- [ ] **Step 4: 运行确认通过 + 全量套件**

Run: `node --test using-obsidian/scripts/lib/index-build.test.mjs`
Expected: PASS
Run: `node --test using-obsidian/scripts/lib/*.test.mjs using-obsidian/scripts/*.test.mjs`
Expected: PASS（现有 buildIndex/lint/query 断言不变）

- [ ] **Step 5: 提交**

```bash
git add using-obsidian/scripts/lib/index-build.mjs using-obsidian/scripts/lib/index-build.test.mjs
git commit -m "refactor(kb): index-build 通用解析全部 frontmatter 键"
```

---

## Task 7: `init.mjs` 读 `schema.initDirs`

**Files:**
- Modify: `using-obsidian/scripts/lib/init.mjs:31-35`
- Test: 复用 `obsidian-kb.test.mjs` 的 init 用例

**Interfaces:**
- Consumes: `initDirs` from `./registry.mjs`
- Produces: `initKnowledgeBase` 行为不变（同一组预建目录），但目录列表来自注册表

- [ ] **Step 1: 运行现有 init 测试，确认基线绿**

Run: `node --test using-obsidian/scripts/obsidian-kb.test.mjs`
Expected: PASS

- [ ] **Step 2: 改 `init.mjs`**

顶部加 import：

```javascript
import { initDirs } from './registry.mjs';
```

把硬编码目录循环改为：

```javascript
  for (const directory of initDirs()) {
    await mkdir(path.join(kbRoot, directory), { recursive: true });
  }
```

- [ ] **Step 3: 运行确认通过 + 全量套件**

Run: `node --test using-obsidian/scripts/obsidian-kb.test.mjs`
Expected: PASS（`initKnowledgeBase creates workspace directories...` 用例不变；不会误建 `global/extra`）
Run: `node --test using-obsidian/scripts/lib/*.test.mjs using-obsidian/scripts/*.test.mjs`
Expected: PASS

- [ ] **Step 4: 提交**

```bash
git add using-obsidian/scripts/lib/init.mjs
git commit -m "refactor(kb): init.mjs 读 schema.initDirs"
```

---

## Task 8: 文档生成器 `lib/generate-docs.mjs` + `type` 枚举区段 + CLI 接线

**Files:**
- Create: `using-obsidian/scripts/lib/generate-docs.mjs`
- Create: `using-obsidian/scripts/lib/generate-docs.test.mjs`
- Modify: `obsidian-kb-authoring/references/frontmatter-schema.md`（插入 GENERATED 标记于 `type` 枚举处）
- Modify: `using-obsidian/scripts/lib/cli.mjs`、`using-obsidian/scripts/obsidian-kb.mjs`

**Interfaces:**
- Consumes: `loadRegistry`、`canonicalTypes`、`scaffoldableTypes`、`templatesDir` from `./registry.mjs`；`requiredSections` from `./template.mjs`
- Produces:
  - `DOC_TARGETS: Array<{ file, id, render }>`（T8 先含 1 项，T9–T11 追加）
  - `generateDocs({ check?: boolean }) => { written: string[], drift: string[] }`（`check` 模式只比对不写，发现差异填 `drift`）
  - CLI 命令 `generate-docs [--check]`

- [ ] **Step 1: 在 `frontmatter-schema.md` 插入标记**

把现有 `**\`type\`：**` 那段（枚举值的反引号列表）用标记包住。定位 `**\`type\`：**` 下面那行长枚举，替换为：

```markdown
**`type`：**
<!-- GENERATED:type-enum:start -->
`use-case` · `domain` · `glossary` · `flow` · `candidate` · `contract` · `module` · `architecture` · `api-surface` · `data-model` · `config` · `implementation` · `runtime-notes` · `risk` · `index` · `log` · `coverage` · `extra`
<!-- GENERATED:type-enum:end -->
```

- [ ] **Step 2: 写失败测试**

```javascript
// using-obsidian/scripts/lib/generate-docs.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { generateDocs } from './generate-docs.mjs';

test('generate-docs --check reports no drift on a freshly generated tree', async () => {
  const res = await generateDocs({ check: true });
  assert.deepEqual(res.drift, []);
});
```

> 该用例在 Step 4 首次写入后才转绿（先写入使文档与渲染结果一致，再 `--check` 幂等）。

- [ ] **Step 3: 实现 `generate-docs.mjs`（infra + type-enum 渲染）**

```javascript
// using-obsidian/scripts/lib/generate-docs.mjs
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { registryPath, canonicalTypes } from './registry.mjs';

const REF = path.join(path.dirname(registryPath()), 'references');

function replaceRegion(text, id, body) {
  const s = `<!-- GENERATED:${id}:start -->`;
  const e = `<!-- GENERATED:${id}:end -->`;
  const si = text.indexOf(s);
  const ei = text.indexOf(e);
  if (si === -1 || ei === -1 || ei < si) throw new Error(`markers for ${id} not found`);
  return `${text.slice(0, si + s.length)}\n${body}\n${text.slice(ei)}`;
}

function renderTypeEnum() {
  return canonicalTypes().map((t) => `\`${t}\``).join(' · ');
}

// T9–T11 会向本数组追加 { file, id, render }。
export const DOC_TARGETS = [
  { file: path.join(REF, 'frontmatter-schema.md'), id: 'type-enum', render: renderTypeEnum },
];

export async function generateDocs({ check = false } = {}) {
  const written = [];
  const drift = [];
  // 按 file 聚合，一个文件可能含多个 region。
  const byFile = new Map();
  for (const t of DOC_TARGETS) {
    if (!byFile.has(t.file)) byFile.set(t.file, []);
    byFile.get(t.file).push(t);
  }
  for (const [file, targets] of byFile) {
    const current = await readFile(file, 'utf8');
    let next = current;
    for (const t of targets) next = replaceRegion(next, t.id, t.render());
    if (next !== current) {
      if (check) drift.push(path.relative(process.cwd(), file));
      else { await writeFile(file, next, 'utf8'); written.push(path.relative(process.cwd(), file)); }
    }
  }
  return { written, drift };
}
```

- [ ] **Step 4: 首次生成并确认 `--check` 幂等**

Run: `node using-obsidian/scripts/obsidian-kb.mjs generate-docs`（CLI 接线见 Step 5；可先临时 `node -e "import('./using-obsidian/scripts/lib/generate-docs.mjs').then(m=>m.generateDocs())"`）
然后：
Run: `node --test using-obsidian/scripts/lib/generate-docs.test.mjs`
Expected: PASS（drift 为空）

- [ ] **Step 5: CLI 接线**

`cli.mjs`：顶部加 `import { generateDocs } from './generate-docs.mjs';`，并在 `types` 分支后加：

```javascript
  if (command === 'generate-docs') {
    const result = await generateDocs({ check: Boolean(context.flags.check) });
    printResult(result, context.json);
    if (context.flags.check && result.drift.length > 0) process.exitCode = 1;
    return;
  }
```

`USAGE` 串里把命令清单补上 `generate-docs`。`obsidian-kb.mjs` 追加导出：`export { generateDocs, DOC_TARGETS } from './lib/generate-docs.mjs';`

- [ ] **Step 6: 全量套件 + 提交**

Run: `node --test using-obsidian/scripts/lib/*.test.mjs using-obsidian/scripts/*.test.mjs`
Expected: PASS

```bash
git add using-obsidian/scripts/lib/generate-docs.mjs using-obsidian/scripts/lib/generate-docs.test.mjs using-obsidian/scripts/lib/cli.mjs using-obsidian/scripts/obsidian-kb.mjs obsidian-kb-authoring/references/frontmatter-schema.md
git commit -m "feat(kb): generate-docs 生成器 + type 枚举区段 + CLI --check"
```

---

## Task 9: `view-model.md` 的 `type→视图` 表区段

**Files:**
- Modify: `using-obsidian/scripts/lib/generate-docs.mjs`（加 renderer + DOC_TARGETS 条目）
- Modify: `obsidian-kb-authoring/references/view-model.md`（在 type→视图透镜表处插标记）

**Interfaces:**
- Consumes: `loadRegistry`、`canonicalTypes` from `./registry.mjs`
- Produces: DOC_TARGETS 追加 `{ id: 'type-view', render: renderTypeViewTable }`

- [ ] **Step 1: 在 `view-model.md` 插标记**

把"## type → 视图透镜映射"下的表（表头 `| \`type\` | 视图透镜 |` 与数据行）整体用标记包住，保留表头、只让数据行进 GENERATED 区：

```markdown
| `type` | 视图透镜 |
|---|---|
<!-- GENERATED:type-view:start -->
| `use-case` | `usecase` |
（…现有数据行原样保留，作为首次生成前的占位…）
<!-- GENERATED:type-view:end -->
```

- [ ] **Step 2: 加 renderer 与 DOC_TARGETS 条目**

在 `generate-docs.mjs` 加：

```javascript
import { loadRegistry } from './registry.mjs'; // 若尚未引入

function renderTypeViewTable() {
  const t = loadRegistry().types;
  return canonicalTypes().map((k) => `| \`${k}\` | \`${t[k].view}\` |`).join('\n');
}
```

并向 `DOC_TARGETS` 追加：

```javascript
  { file: path.join(REF, 'view-model.md'), id: 'type-view', render: renderTypeViewTable },
```

- [ ] **Step 3: 生成 + `--check` 幂等 + 全量套件**

Run: `node using-obsidian/scripts/obsidian-kb.mjs generate-docs`
Run: `node using-obsidian/scripts/obsidian-kb.mjs generate-docs --check`
Expected: drift 为空，退出码 0
Run: `node --test using-obsidian/scripts/lib/*.test.mjs using-obsidian/scripts/*.test.mjs`
Expected: PASS

- [ ] **Step 4: 提交**

```bash
git add using-obsidian/scripts/lib/generate-docs.mjs obsidian-kb-authoring/references/view-model.md
git commit -m "feat(kb): generate-docs 生成 view-model 的 type→视图表"
```

---

## Task 10: `page-shapes.md` 的页型索引表区段

**Files:**
- Modify: `using-obsidian/scripts/lib/generate-docs.mjs`
- Modify: `obsidian-kb-authoring/references/page-shapes.md`

**Interfaces:**
- Consumes: `loadRegistry`、`canonicalTypes` from `./registry.mjs`；`requiredSections` from `./template.mjs`
- Produces: DOC_TARGETS 追加 `{ id: 'page-shapes', render: renderPageShapes }`

- [ ] **Step 1: 在 `page-shapes.md` 插标记**

把"## 页型索引"下的表的**数据行**用标记包住（保留表头 `| 页型(type) | 用途一句话 | 模板 | 刚性边界… |`）。

- [ ] **Step 2: 加 renderer**

```javascript
import { requiredSections } from './template.mjs';

function renderPageShapes() {
  const reg = loadRegistry();
  const t = reg.types;
  const rows = [];
  for (const k of canonicalTypes()) {
    const def = t[k];
    if (!def.template && !def.family) continue; // 跳过无模板的 meta 型(risk/index/log)
    const tmpl = def.family
      ? `\`templates/${def.family}/{${def.members.join(',')}}.template.md\``
      : `\`templates/${def.template}.template.md\``;
    let sections;
    if (def.family) {
      sections = `各文件见模板内 \`## section\``;
    } else {
      sections = requiredSections(k).join(' / ') || '正文';
    }
    rows.push(`| \`${k}\` | ${def.summary || ''} | ${tmpl} | ${sections} |`);
  }
  return rows.join('\n');
}
```

向 `DOC_TARGETS` 追加：

```javascript
  { file: path.join(REF, 'page-shapes.md'), id: 'page-shapes', render: renderPageShapes },
```

- [ ] **Step 3: 生成 + `--check` + 全量套件**

Run: `node using-obsidian/scripts/obsidian-kb.mjs generate-docs`
Run: `node using-obsidian/scripts/obsidian-kb.mjs generate-docs --check`
Expected: drift 空、退出码 0
Run: `node --test using-obsidian/scripts/lib/*.test.mjs using-obsidian/scripts/*.test.mjs`
Expected: PASS

- [ ] **Step 4: 提交**

```bash
git add using-obsidian/scripts/lib/generate-docs.mjs obsidian-kb-authoring/references/page-shapes.md
git commit -m "feat(kb): generate-docs 生成 page-shapes 页型索引表"
```

---

## Task 11: `directory-contract.md` 的落点叶子区段

**Files:**
- Modify: `using-obsidian/scripts/lib/generate-docs.mjs`
- Modify: `obsidian-kb-authoring/references/directory-contract.md`

**Interfaces:**
- Consumes: `loadRegistry`、`scaffoldableTypes` from `./registry.mjs`
- Produces: DOC_TARGETS 追加 `{ id: 'target-leaves', render: renderTargetLeaves }`

- [ ] **Step 1: 在 `directory-contract.md` 末尾"### 落点速查"小节插标记**

在文末新增一小节（不动现有手写目录树叙事）：

```markdown
### 落点速查（生成）

| scaffold 标识 | 落点 |
|---|---|
<!-- GENERATED:target-leaves:start -->
（首次生成前留空一行占位）
<!-- GENERATED:target-leaves:end -->
```

- [ ] **Step 2: 加 renderer**

```javascript
import { scaffoldableTypes } from './registry.mjs';

function renderTargetLeaves() {
  const t = loadRegistry().types;
  return scaffoldableTypes()
    .map((k) => `| \`${k}\` | \`${t[k].target}\` |`)
    .join('\n');
}
```

向 `DOC_TARGETS` 追加：

```javascript
  { file: path.join(REF, 'directory-contract.md'), id: 'target-leaves', render: renderTargetLeaves },
```

- [ ] **Step 3: 生成 + `--check` + 全量套件**

Run: `node using-obsidian/scripts/obsidian-kb.mjs generate-docs`
Run: `node using-obsidian/scripts/obsidian-kb.mjs generate-docs --check`
Expected: drift 空、退出码 0
Run: `node --test using-obsidian/scripts/lib/*.test.mjs using-obsidian/scripts/*.test.mjs`
Expected: PASS

- [ ] **Step 4: 提交**

```bash
git add using-obsidian/scripts/lib/generate-docs.mjs obsidian-kb-authoring/references/directory-contract.md
git commit -m "feat(kb): generate-docs 生成 directory-contract 落点速查"
```

---

## Task 12: 收尾——单一来源指针 + `--check` 守门说明

**Files:**
- Modify: `obsidian-kb-authoring/SKILL.md`、`obsidian-kb-authoring/references/frontmatter-schema.md`、`obsidian-kb-authoring/references/directory-contract.md`、`obsidian-kb-authoring/references/view-model.md`、`obsidian-kb-authoring/references/page-shapes.md`、`using-obsidian/scripts/README.md`
- Test: 全量套件 + `generate-docs --check`

**Interfaces:** 无新代码，仅文档指针。

- [ ] **Step 1: 在参考文档顶部加单一来源声明**

在四份生成型文档顶部各加一行：

```markdown
> 本文件标 `<!-- GENERATED -->` 的区段由 `obsidian-kb-authoring/registry.yaml` 经 `generate-docs` 生成，**勿手改**；改结构改注册表后重新生成。
```

在 `frontmatter-schema.md` 顶部补：通用 schema（Tier1 必填、confidence/status 枚举、type 枚举）唯一来源为 `registry.yaml` 的 `schema` 段。`directory-contract.md` 单一来源纪律表中，把"目录路径/落点"的唯一来源由本文件改注明 `registry.yaml` 的 `types.*.target`。

- [ ] **Step 2: 在 SKILL.md 与 README 更新指针**

`obsidian-kb-authoring/SKILL.md` 的参考文件表追加一行：注册表 `registry.yaml` = 落点/视图/lint/枚举的结构唯一来源；模板只管 section 与专有字段。`using-obsidian/scripts/README.md` 增 `generate-docs [--check]` 命令说明，并写明"改注册表/模板后须跑 `generate-docs`，CI/pre-commit 用 `generate-docs --check` 守门"。

- [ ] **Step 3: 末次校验**

Run: `node using-obsidian/scripts/obsidian-kb.mjs generate-docs --check`
Expected: drift 空、退出码 0
Run: `node --test using-obsidian/scripts/lib/*.test.mjs using-obsidian/scripts/*.test.mjs`
Expected: PASS（全绿，且较基线新增 yaml/registry/index-build/generate-docs 用例）

- [ ] **Step 4: 提交**

```bash
git add obsidian-kb-authoring using-obsidian/scripts/README.md
git commit -m "docs(kb): 参考文档指向 registry.yaml 单一来源 + generate-docs 守门说明"
```

---

## 自检对照（spec → 任务）

- 注册表唯一来源（spec §5）→ T2/T3
- YAML 解析器封闭特性集（spec §5.2）→ T1
- 模板聚焦、专有字段留模板（spec §3）→ 模板不动（T4 仅改代码读取方式）
- 代码数据驱动（spec §6）→ T4（template）/T5（lint）/T6（index-build）/T7（init）；`scaffold.mjs` 无需改动（见下注）
- linkage 数据化精确复刻（spec §6.1）→ T5 + T3 注册表 linkage
- 参考文档生成 + `--check`（spec §8）→ T8–T11
- 测试（spec §9）→ 各任务 TDD + 全量套件门禁
- 行为零回退（spec §2.1）→ 黄金对照（T3）+ 全程不改现有测试

> **scaffold.mjs 无需改动**：其 `listTypes()` 现为 `new Set(Object.keys(TYPE_FILE)); add('flow'); sort()`。T4 后 `TYPE_FILE` 变为注册表派生（仅含有模板的键，flow 因 `template:null` 不在内），`+ flow` 后仍恰好等于 `scaffoldableTypes()`（= `OLD_SCAFFOLDABLE` 的 19 个）。`types` 命令输出由现有 `scaffold.test`/全量套件守住不变，因此本文件不需修改。
