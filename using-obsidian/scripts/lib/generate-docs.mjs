import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { registryPath, canonicalTypes, loadRegistry } from './registry.mjs';

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

function renderTypeViewTable() {
  const t = loadRegistry().types;
  return canonicalTypes().map((k) => `| \`${k}\` | \`${t[k].view}\` |`).join('\n');
}

// T10–T11 会向本数组追加 { file, id, render }。
export const DOC_TARGETS = [
  { file: path.join(REF, 'frontmatter-schema.md'), id: 'type-enum', render: renderTypeEnum },
  { file: path.join(REF, 'view-model.md'), id: 'type-view', render: renderTypeViewTable },
];

export async function generateDocs({ check = false } = {}) {
  const written = [];
  const drift = [];
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
