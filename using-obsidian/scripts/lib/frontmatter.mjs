export function parseFrontmatter(markdown) {
  const normalized = markdown.replace(/\r\n/g, '\n');
  if (!normalized.startsWith('---\n')) {
    return { data: {}, body: markdown };
  }
  const end = normalized.indexOf('\n---', 4);
  if (end === -1) {
    return { data: {}, body: markdown };
  }

  const raw = normalized.slice(4, end).trimEnd();
  const body = normalized.slice(end + 4).replace(/^\n/, '');
  return { data: parseSimpleYaml(raw), body };
}

export function parseSimpleYaml(raw) {
  const data = {};
  const lines = raw.split(/\r?\n/);
  let activeKey = null;

  for (const line of lines) {
    if (!line.trim()) continue;
    const listMatch = line.match(/^\s+-\s*(.*)$/);
    if (listMatch && activeKey) {
      if (!Array.isArray(data[activeKey])) data[activeKey] = [];
      data[activeKey].push(stripQuotes(listMatch[1].trim()));
      continue;
    }

    const keyMatch = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!keyMatch) continue;
    const [, key, rawValue] = keyMatch;
    activeKey = key;

    if (rawValue === '' || rawValue === '[]') {
      data[key] = [];
    } else if (rawValue.startsWith('[') && rawValue.endsWith(']')) {
      data[key] = rawValue
        .slice(1, -1)
        .split(',')
        .map((item) => stripQuotes(item.trim()))
        .filter(Boolean);
    } else {
      data[key] = stripQuotes(rawValue.trim());
    }
  }

  return data;
}

export function stripQuotes(value) {
  return value.replace(/^['"]|['"]$/g, '');
}

export function extractWikiLinks(markdown) {
  const links = [];
  // HTML 注释（含 scaffold 的 `<!-- 填:… [[示例]] -->` 占位）里的链接不被 Obsidian 渲染，不计入链接图。
  const visible = markdown.replace(/<!--[\s\S]*?-->/g, '');
  const regex = /!?\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|[^\]]+)?\]\]/g;
  for (const match of visible.matchAll(regex)) {
    const target = match[1].trim();
    if (target) links.push(target);
  }
  return [...new Set(links)];
}

export function arrayValue(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null || value === '') return [];
  return [value];
}

export function normalizeTarget(target) {
  const normalized = target.replace(/\\/g, '/').replace(/^\.\//, '');
  return normalized.endsWith('.md') ? normalized : `${normalized}.md`;
}
