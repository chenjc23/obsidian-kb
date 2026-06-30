import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  loadRegistry, validTypes, scaffoldableTypes,
} from './registry.mjs';

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
