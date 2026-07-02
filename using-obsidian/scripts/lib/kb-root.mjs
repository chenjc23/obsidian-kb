import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';

// 结构标记:一个知识库根通常含这些。
const MARKERS = ['index.md', 'log.md', 'repos', 'global'];

function kbRootScore(dir) {
  return MARKERS.filter((m) => existsSync(path.join(dir, m))).length;
}

// 「像 kb-root」= 名为 code-kb/,或含 ≥2 个结构标记。
function isKbRootLike(dir) {
  if (!existsSync(dir)) return false;
  if (path.basename(dir) === 'code-kb') return true;
  return kbRootScore(dir) >= 2;
}

// 打分用于多候选取优:结构标记数 + 名为 code-kb 的加权。
function likenessScore(dir) {
  return kbRootScore(dir) + (path.basename(dir) === 'code-kb' ? 1 : 0);
}

// 最近祖先里的 code-kb/(从 cwd 的父目录向上,不含 cwd 自身)。
function findAncestorCodeKb(cwd) {
  let dir = path.dirname(cwd);
  while (true) {
    const candidate = path.join(dir, 'code-kb');
    if (existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) return undefined;
    dir = parent;
  }
}

// cwd 直接子目录里「像 kb-root」的那些。
function childKbRoots(cwd) {
  let entries;
  try {
    entries = readdirSync(cwd, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries
    .filter((e) => e.isDirectory())
    .map((e) => path.join(cwd, e.name))
    .filter(isKbRootLike);
}

// 确定性定位知识库根。返回 { kbRoot, found, source, candidates }。
// 只定位、不新建:全无匹配时 found:false + kbRoot 给出默认落点(cwd/code-kb),由调用方按读写决定是否建。
export function resolveKbRoot({ cwd = process.cwd(), explicit } = {}) {
  const defaultRoot = path.join(cwd, 'code-kb');

  if (explicit) {
    const kbRoot = path.resolve(cwd, explicit);
    return { kbRoot, found: existsSync(kbRoot), source: 'explicit', candidates: [] };
  }
  if (isKbRootLike(cwd)) {
    return { kbRoot: cwd, found: true, source: 'cwd', candidates: [] };
  }
  if (existsSync(defaultRoot)) {
    return { kbRoot: defaultRoot, found: true, source: 'cwd-child', candidates: [] };
  }
  const ancestor = findAncestorCodeKb(cwd);
  if (ancestor) {
    return { kbRoot: ancestor, found: true, source: 'ancestor', candidates: [] };
  }
  const children = childKbRoots(cwd);
  if (children.length === 1) {
    return { kbRoot: children[0], found: true, source: 'workspace-child', candidates: [] };
  }
  if (children.length > 1) {
    const ranked = [...children].sort((a, b) => likenessScore(b) - likenessScore(a));
    if (likenessScore(ranked[0]) > likenessScore(ranked[1])) {
      return { kbRoot: ranked[0], found: true, source: 'workspace-child', candidates: [] };
    }
    const top = likenessScore(ranked[0]);
    return {
      kbRoot: defaultRoot,
      found: false,
      source: 'ambiguous',
      candidates: ranked.filter((d) => likenessScore(d) === top),
    };
  }
  return { kbRoot: defaultRoot, found: false, source: 'default', candidates: [] };
}
