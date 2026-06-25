import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
// templates 在 authoring skill 下；lib/ 在 using-obsidian/scripts/lib
export function templatesDir() {
  return path.resolve(HERE, '../../../obsidian-kb-authoring/templates');
}

const TYPE_FILE = { /* type → 模板文件名(无扩展) */
  'use-case': 'use-case', domain: 'domain', contract: 'contract', coverage: 'coverage',
  module: 'module', architecture: 'architecture', 'system-architecture': 'architecture',
  candidate: 'candidate-flow', 'candidate-flow': 'candidate-flow', glossary: 'glossary',
  'api-surface': 'api-surface', 'data-model': 'data-models', 'data-models': 'data-models',
  config: 'config', 'runtime-notes': 'runtime-notes', implementation: 'key-implementations',
  'key-implementations': 'key-implementations', extra: 'extra',
};

export function loadTemplate(type, flowFile) {
  if (type === 'flow') {
    if (!flowFile) throw new Error('flow 需指定 flowFile');
    return readFileSync(path.join(templatesDir(), 'flow', `${flowFile}.template.md`), 'utf8');
  }
  const name = TYPE_FILE[type];
  if (!name) throw new Error(`未知页型: ${type}`);
  return readFileSync(path.join(templatesDir(), `${name}.template.md`), 'utf8');
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

// 镜像 directory-contract.md 的落点路径——改目录契约必须同步这里。
const FLOW_FILES = ['调用树', '主干流程', '分支主题', '跨边界数据流', '数据结构', '自查报告'];
export function targetPath(type, { repo, title, topic, flowFile } = {}) {
  switch (type) {
    case 'module': return `repos/${repo}/modules/${title}.md`;
    case 'contract': return `global/contracts/${title}.md`;
    case 'coverage': return 'global/architecture/coverage.md';
    case 'use-case': return `global/use-cases/${title}.md`;
    case 'domain': return `global/domains/${title}.md`;
    case 'system-architecture': return 'global/architecture/system-architecture.md';
    case 'architecture': return `repos/${repo}/architecture.md`;
    case 'candidate-flow': case 'candidate': return `repos/${repo}/candidate-flow.md`;
    case 'glossary': return `repos/${repo}/glossary.md`;
    case 'api-surface': return `repos/${repo}/api-surface.md`;
    case 'data-models': case 'data-model': return `repos/${repo}/data-models.md`;
    case 'config': return `repos/${repo}/config-and-env.md`;
    case 'runtime-notes': return `repos/${repo}/runtime-notes.md`;
    case 'key-implementations': case 'implementation': return `repos/${repo}/key-implementations.md`;
    case 'extra': return `global/extra/${title}.md`;
    case 'flow': return `repos/${repo}/flows/${topic}/${flowFile}.md`;
    default: throw new Error(`未知页型: ${type}`);
  }
}
export { FLOW_FILES, TYPE_FILE };
