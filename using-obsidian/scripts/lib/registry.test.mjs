import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdtemp, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  loadRegistry, validTypes, scaffoldableTypes, authoringDir,
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
    pageType: alpha
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

test('validTypes dedups aliases via pageType', async () => {
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

test('throws on duplicate stage id within a pipeline', async () => {
  const dup = `${GOOD}pipelines:
  p:
    stages:
      - id: a
      - id: a
`;
  const file = await fixture(dup);
  assert.throws(() => loadRegistry({ force: true, file }), /duplicate stage id/);
});

test('pipeline stages accept instructions as a block list', async () => {
  const file = await fixture(`${GOOD}pipelines:
  p:
    stages:
      - id: a
        instructions:
          - pipelines/a.md
          - pipelines/b.md
`);
  const root = path.dirname(file);
  await mkdir(path.join(root, 'pipelines'), { recursive: true });
  await writeFile(path.join(root, 'pipelines', 'a.md'), '# a\n');
  await writeFile(path.join(root, 'pipelines', 'b.md'), '# b\n');
  const reg = loadRegistry({ force: true, file });
  assert.deepEqual(reg.pipelines.p.stages[0].instructions, ['pipelines/a.md', 'pipelines/b.md']);
});

test('throws when pipeline stage uses deprecated instruction field', async () => {
  const file = await fixture(`${GOOD}pipelines:
  p:
    stages:
      - id: a
        instruction: pipelines/a.md
`);
  assert.throws(() => loadRegistry({ force: true, file }), /deprecated instruction/);
});

// ── 黄金对照：把页型集合与落点钉成字面快照；注册表若改动到这些值，必须同步更新此处 ──

const CURRENT_VALID = ['use-case', 'domain', 'glossary', 'flow', 'candidate', 'contract',
  'overview', 'constraints', 'architecture', 'api-surface', 'api-depend', 'data-model',
  'specifications', 'resource-analysis', 'human-interfaces', 'repo-usecase', 'submodule',
  'risk', 'index', 'log', 'coverage', 'extra'];

const SCAFFOLDABLE = ['api-depend', 'api-surface', 'architecture', 'candidate', 'candidate-flow',
  'constraints', 'contract', 'coverage', 'data-model', 'domain', 'extra', 'flow', 'glossary',
  'human-interfaces', 'overview', 'repo-usecase', 'resource-analysis', 'specifications',
  'submodule', 'system-architecture', 'use-case'].sort();

const TARGET_GOLDEN = {
  'use-case': ['global/use-cases/T.md', { title: 'T' }],
  domain: ['global/domains/T.md', { title: 'T' }],
  contract: ['global/contracts/T.md', { title: 'T' }],
  coverage: ['global/architecture/coverage.md', {}],
  overview: ['repos/R/overview.md', { repo: 'R' }],
  constraints: ['repos/R/constraints.md', { repo: 'R' }],
  architecture: ['repos/R/architecture.md', { repo: 'R' }],
  'system-architecture': ['global/architecture/system-architecture.md', {}],
  candidate: ['repos/R/candidate-flow.md', { repo: 'R' }],
  'candidate-flow': ['repos/R/candidate-flow.md', { repo: 'R' }],
  glossary: ['repos/R/glossary.md', { repo: 'R' }],
  'api-surface': ['repos/R/api-surface.md', { repo: 'R' }],
  'api-depend': ['repos/R/api-depend.md', { repo: 'R' }],
  'data-model': ['repos/R/data-models.md', { repo: 'R' }],
  specifications: ['repos/R/specifications.md', { repo: 'R' }],
  'resource-analysis': ['repos/R/resource-analysis.md', { repo: 'R' }],
  'human-interfaces': ['repos/R/human-interfaces.md', { repo: 'R' }],
  'repo-usecase': ['repos/R/usecases/T.md', { repo: 'R', title: 'T' }],
  submodule: ['repos/R/submodules/TOPIC/上下文.md', { repo: 'R', topic: 'TOPIC', flowFile: '上下文' }],
  extra: ['global/extra/T.md', { title: 'T' }],
  flow: ['repos/R/flows/TOPIC/主干流程.md', { repo: 'R', topic: 'TOPIC', flowFile: '主干流程' }],
};

test('GOLDEN: real registry loads and validates', () => {
  loadRegistry({ force: true });
});

test('GOLDEN: validTypes equals current directory contract', () => {
  loadRegistry({ force: true });
  assert.deepEqual([...validTypes()].sort(), [...CURRENT_VALID].sort());
});

test('GOLDEN: scaffoldableTypes equals intended set (dead aliases dropped)', () => {
  loadRegistry({ force: true });
  assert.deepEqual(scaffoldableTypes(), SCAFFOLDABLE);
});

test('GOLDEN: targetPath matches old switch for every scaffold id', () => {
  loadRegistry({ force: true });
  for (const [type, [expected, args]] of Object.entries(TARGET_GOLDEN)) {
    assert.equal(targetPath(type, args), expected, `targetPath(${type})`);
  }
});

test('GOLDEN: registry defines ingest and deep-analysis pipelines', () => {
  const reg = loadRegistry({ force: true });
  assert.ok(reg.pipelines.ingest, 'ingest pipeline present');
  assert.ok(reg.pipelines['deep-analysis'], 'deep-analysis pipeline present');
  const ids = reg.pipelines.ingest.stages.map((s) => s.id);
  assert.deepEqual(ids, ['terrain', 'submodules', 'candidate-flows', 'supplements',
    'domains-contracts', 'backlinks', 'coverage', 'deep-dive']);
});

test('GOLDEN: every pipeline stage instruction file exists', () => {
  const reg = loadRegistry({ force: true });
  for (const pdef of Object.values(reg.pipelines)) {
    for (const stage of pdef.stages) {
      for (const instruction of stage.instructions || []) {
        assert.ok(existsSync(path.join(authoringDir(), instruction)),
          `instruction missing: ${instruction}`);
      }
    }
  }
});
