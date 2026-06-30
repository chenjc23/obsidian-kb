import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  registryPath, canonicalTypes, loadRegistry, allTypes,
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

// 从 types.*.target 派生整棵目录树：按 target 路径去重（别名同落点只显示一次，
// 用 canonical 页型的 summary 作叶子注释），渲染成缩进树。
function renderDirTree() {
  const t = loadRegistry().types;
  const leaves = new Map(); // path -> comment（首次写入优先，canonical 先于别名）
  const addLeaf = (p, comment) => { if (p && !leaves.has(p)) leaves.set(p, comment || ''); };
  const canon = new Set(canonicalTypes());
  const ordered = ['index', 'log', ...canonicalTypes().filter((k) => k !== 'index' && k !== 'log'),
    ...allTypes().filter((k) => !canon.has(k))];
  for (const k of ordered) {
    const def = t[k];
    if (!def) continue;
    if (def.family && Array.isArray(def.members)) {
      for (const m of def.members) addLeaf(def.target.replaceAll('{member}', m), '');
    } else {
      addLeaf(def.target, def.summary);
    }
  }
  const root = new Map();
  for (const [p, comment] of leaves) {
    let node = root;
    const parts = p.split('/');
    parts.forEach((part, i) => {
      if (!node.has(part)) node.set(part, { children: new Map(), comment: '' });
      const child = node.get(part);
      if (i === parts.length - 1) child.comment = comment;
      node = child.children;
    });
  }
  const lines = ['```text', 'code-kb/'];
  const walk = (node, depth) => {
    for (const [name, child] of node) {
      const hasKids = child.children.size > 0;
      const comment = child.comment ? `  # ${child.comment}` : '';
      lines.push(`${'  '.repeat(depth)}${name}${hasKids ? '/' : ''}${comment}`);
      walk(child.children, depth + 1);
    }
  };
  walk(root, 1);
  lines.push('```');
  return lines.join('\n');
}

export const DOC_TARGETS = [
  { file: path.join(REF, 'frontmatter-schema.md'), id: 'type-enum', render: renderTypeEnum },
  { file: path.join(REF, 'view-model.md'), id: 'type-view', render: renderTypeViewTable },
  { file: path.join(REF, 'page-shapes.md'), id: 'page-shapes', render: renderPageShapes },
  { file: path.join(REF, 'directory-contract.md'), id: 'dir-tree', render: renderDirTree },
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
