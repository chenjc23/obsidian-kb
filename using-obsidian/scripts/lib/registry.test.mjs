import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  loadRegistry, validTypes, scaffoldableTypes,
} from './registry.mjs';
import { targetPath } from './template.mjs';

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
  const file = await fixture(GOOD);
  loadRegistry({ force: true, file });
  assert.deepEqual([...validTypes()].sort(), ['alpha', 'meta-only']);
});

test('scaffoldableTypes excludes templateless types', async () => {
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

// ── 迁移黄金对照：把今天的硬编码值钉成字面快照，证明搬运零偏差 ──

const OLD_VALID = ['use-case', 'domain', 'glossary', 'flow', 'candidate', 'contract', 'module',
  'architecture', 'api-surface', 'data-model', 'config', 'implementation', 'runtime-notes',
  'risk', 'index', 'log', 'coverage', 'extra'];

const OLD_SCAFFOLDABLE = ['api-surface', 'architecture', 'candidate', 'candidate-flow', 'config',
  'contract', 'coverage', 'data-model', 'data-models', 'domain', 'extra', 'flow', 'glossary',
  'implementation', 'key-implementations', 'module', 'runtime-notes', 'system-architecture',
  'use-case'].sort();

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
  loadRegistry({ force: true });
});

test('GOLDEN: validTypes equals old VALID_TYPES', () => {
  loadRegistry({ force: true });
  assert.deepEqual([...validTypes()].sort(), [...OLD_VALID].sort());
});

test('GOLDEN: scaffoldableTypes equals old listTypes', () => {
  loadRegistry({ force: true });
  assert.deepEqual(scaffoldableTypes(), OLD_SCAFFOLDABLE);
});

test('GOLDEN: targetPath matches old switch for every scaffold id', () => {
  loadRegistry({ force: true });
  for (const [type, [expected, args]] of Object.entries(TARGET_GOLDEN)) {
    assert.equal(targetPath(type, args), expected, `targetPath(${type})`);
  }
});
