import { readFileSync } from 'node:fs';
import path from 'node:path';
import { loadRegistry, templatesDir } from './registry.mjs';

export { templatesDir };

function typeDef(type) {
  const def = loadRegistry().types[type];
  if (!def) throw new Error(`未知页型: ${type}`);
  return def;
}

export function loadTemplate(type, member) {
  const def = typeDef(type);
  if (def.members) {
    if (!member || !def.members[member]) throw new Error(`${type} 需指定有效成员: ${member}`);
    return readFileSync(path.join(templatesDir(), `${def.members[member].template}.template.md`), 'utf8');
  }
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

export function requiredSections(type, member) {
  const text = loadTemplate(type, member);
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
  let pattern;
  if (def.members) {
    if (!flowFile || !def.members[flowFile]) throw new Error(`${type} 需指定有效成员: ${flowFile}`);
    pattern = def.members[flowFile].target;
  } else {
    pattern = def.target;
  }
  if (!pattern) throw new Error(`页型无落点: ${type}`);
  return pattern
    .replaceAll('{repo}', repo ?? '')
    .replaceAll('{title}', title ?? '')
    .replaceAll('{topic}', topic ?? '');
}

// 兼容旧具名导出：从注册表派生。
const reg = loadRegistry();
export const FLOW_FILES = Object.keys(reg.types.flow.members);
export const TYPE_FILE = Object.fromEntries(
  Object.entries(reg.types).filter(([, d]) => d.template).map(([k, d]) => [k, d.template]),
);
