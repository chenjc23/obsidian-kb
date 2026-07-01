import { stripQuotes } from './frontmatter.mjs';

function stripComment(line) {
  if (line.trimStart().startsWith('#')) return '';
  const idx = line.indexOf(' #');
  return idx === -1 ? line : line.slice(0, idx);
}

function parseScalar(raw) {
  const v = raw.trim();
  if (v === '') return '';
  if (v === 'null' || v === '~') return null;
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (v.startsWith('[') && v.endsWith(']')) {
    return v.slice(1, -1).split(',').map((s) => stripQuotes(s.trim())).filter((s) => s.length > 0);
  }
  return stripQuotes(v);
}

export function parseYaml(text) {
  const lines = [];
  for (const rawLine of text.replace(/\r\n/g, '\n').split('\n')) {
    const noComment = stripComment(rawLine);
    if (noComment.trim() === '') continue;
    const indent = noComment.length - noComment.trimStart().length;
    lines.push({ indent, content: noComment.trim() });
  }
  let i = 0;

  function keyValue(content) {
    const m = content.match(/^([^:]+):\s*(.*)$/);
    if (!m) throw new Error(`Invalid YAML mapping line: ${content}`);
    return { key: m[1].trim(), rest: m[2] };
  }

  function parseValue(rest, ownerIndent) {
    if (rest !== '') return parseScalar(rest);
    if (i < lines.length && lines[i].indent > ownerIndent) return parseBlock(lines[i].indent);
    return null;
  }

  function parseMapping(indent) {
    const map = {};
    while (i < lines.length && lines[i].indent === indent && !lines[i].content.startsWith('- ')) {
      const { key, rest } = keyValue(lines[i].content);
      i += 1;
      map[key] = parseValue(rest, indent);
    }
    return map;
  }

  function parseSequence(indent) {
    const arr = [];
    while (i < lines.length && lines[i].indent === indent && lines[i].content.startsWith('- ')) {
      const after = lines[i].content.slice(2);
      if (/^[^:]+:\s*/.test(after) && !after.startsWith('[')) {
        const innerIndent = indent + 2;
        const item = {};
        const { key, rest } = keyValue(after);
        i += 1;
        item[key] = parseValue(rest, innerIndent);
        while (i < lines.length && lines[i].indent === innerIndent && !lines[i].content.startsWith('- ')) {
          const kv = keyValue(lines[i].content);
          i += 1;
          item[kv.key] = parseValue(kv.rest, innerIndent);
        }
        arr.push(item);
      } else {
        arr.push(parseScalar(after));
        i += 1;
      }
    }
    return arr;
  }

  function parseBlock(indent) {
    if (i >= lines.length) return null;
    return lines[i].content.startsWith('- ') ? parseSequence(indent) : parseMapping(indent);
  }

  return parseBlock(0);
}
