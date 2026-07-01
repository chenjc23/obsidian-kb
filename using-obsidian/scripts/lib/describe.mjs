import { loadRegistry, canonicalTypes, allTypes } from './registry.mjs';
import { requiredSections } from './template.mjs';

// 把 registry.yaml（+ 模板派生的必需 section）打印成可读视图，供 agent 按需取，
// 不再把生成副本写进参考文档。结构事实的唯一来源仍是 registry.yaml。

function typeEnum() {
  return canonicalTypes();
}

function typeViews() {
  const t = loadRegistry().types;
  return canonicalTypes().map((k) => ({ type: k, view: t[k].view }));
}

function pageShapes() {
  const t = loadRegistry().types;
  const out = [];
  for (const k of canonicalTypes()) {
    const def = t[k];
    if (!def.template && !def.members) continue; // 无模板的 meta 型(risk/index/log)跳过
    let template;
    if (def.members) {
      const memberTemplates = Object.values(def.members).map((m) => m.template);
      const dir = memberTemplates[0].includes('/')
        ? `${memberTemplates[0].slice(0, memberTemplates[0].lastIndexOf('/'))}/` : '';
      template = `templates/${dir}{${memberTemplates.map((p) => p.split('/').pop()).join(',')}}.template.md`;
    } else {
      template = `templates/${def.template}.template.md`;
    }
    out.push({
      type: k,
      summary: def.summary || '',
      template,
      sections: def.members ? ['各文件见模板内 ## section'] : requiredSections(k),
    });
  }
  return out;
}

function dirTree() {
  const t = loadRegistry().types;
  const leaves = new Map(); // path -> comment（首次写入优先，canonical 先于别名）
  const addLeaf = (p, c) => { if (p && !leaves.has(p)) leaves.set(p, c || ''); };
  const canon = new Set(canonicalTypes());
  const ordered = ['index', 'log', ...canonicalTypes().filter((k) => k !== 'index' && k !== 'log'),
    ...allTypes().filter((k) => !canon.has(k))];
  for (const k of ordered) {
    const def = t[k];
    if (!def) continue;
    if (def.members) for (const m of Object.values(def.members)) addLeaf(m.target, '');
    else addLeaf(def.target, def.summary);
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
  const lines = ['code-kb/'];
  const walk = (node, depth) => {
    for (const [name, child] of node) {
      const hasKids = child.children.size > 0;
      const c = child.comment ? `  # ${child.comment}` : '';
      lines.push(`${'  '.repeat(depth)}${name}${hasKids ? '/' : ''}${c}`);
      walk(child.children, depth + 1);
    }
  };
  walk(root, 1);
  return lines.join('\n');
}

export function describeData() {
  return {
    types: typeEnum(), views: typeViews(), shapes: pageShapes(), tree: dirTree(),
  };
}

const SECTIONS = ['types', 'views', 'shapes', 'tree'];

function humanSection(name) {
  if (name === 'types') {
    return `# 合法 type 枚举（= registry.yaml 的规范页型）\n${typeEnum().map((x) => `\`${x}\``).join(' · ')}`;
  }
  if (name === 'views') {
    const rows = typeViews().map((r) => `| \`${r.type}\` | \`${r.view}\` |`).join('\n');
    return `# type → 视图透镜（来自 types.*.view）\n| type | 视图 |\n|---|---|\n${rows}`;
  }
  if (name === 'shapes') {
    const rows = pageShapes().map((r) => `| \`${r.type}\` | ${r.summary} | \`${r.template}\` | ${r.sections.join(' / ')} |`).join('\n');
    return `# 页型形状（用途 / 模板 / 必需 section）\n| type | 用途 | 模板 | 必需 section |\n|---|---|---|---|\n${rows}`;
  }
  if (name === 'tree') {
    return `# 目录树（落点来自 types.*.target）\n${dirTree()}`;
  }
  throw new Error(`未知视图: ${name}（可选 ${SECTIONS.join('|')}）`);
}

export function describe({ section } = {}) {
  const names = section ? [section] : SECTIONS;
  return names.map(humanSection).join('\n\n');
}
