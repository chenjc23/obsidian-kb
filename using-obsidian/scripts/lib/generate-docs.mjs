import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  registryPath, canonicalTypes, loadRegistry, scaffoldableTypes,
} from './registry.mjs';
import { requiredSections } from './template.mjs';

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

function renderPageShapes() {
  const t = loadRegistry().types;
  const rows = [];
  for (const k of canonicalTypes()) {
    const def = t[k];
    if (!def.template && !def.family) continue; // 跳过无模板的 meta 型(risk/index/log)
    const tmpl = def.family
      ? `\`templates/${def.family}/{${def.members.join(',')}}.template.md\``
      : `\`templates/${def.template}.template.md\``;
    const sections = def.family ? '各文件见模板内 `## section`' : (requiredSections(k).join(' / ') || '正文');
    rows.push(`| \`${k}\` | ${def.summary || ''} | ${tmpl} | ${sections} |`);
  }
  return rows.join('\n');
}

function renderTargetLeaves() {
  const t = loadRegistry().types;
  return scaffoldableTypes().map((k) => `| \`${k}\` | \`${t[k].target}\` |`).join('\n');
}

export const DOC_TARGETS = [
  { file: path.join(REF, 'frontmatter-schema.md'), id: 'type-enum', render: renderTypeEnum },
  { file: path.join(REF, 'view-model.md'), id: 'type-view', render: renderTypeViewTable },
  { file: path.join(REF, 'page-shapes.md'), id: 'page-shapes', render: renderPageShapes },
  { file: path.join(REF, 'directory-contract.md'), id: 'target-leaves', render: renderTargetLeaves },
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
