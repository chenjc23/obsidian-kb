import { existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

export function today() {
  return new Date().toISOString().slice(0, 10);
}

export function parseArgs(args = []) {
  const parsed = { positional: [], json: false, kbRoot: undefined, limit: 10, flags: {} };
  for (let index = 0; index < args.length; index += 1) {
    const value = args[index];
    if (value === '--json') {
      parsed.json = true;
    } else if (value === '--kb-root') {
      parsed.kbRoot = args[index + 1];
      index += 1;
    } else if (value === '--limit') {
      parsed.limit = Number.parseInt(args[index + 1], 10);
      index += 1;
    } else if (value.startsWith('--')) {
      const key = value.slice(2);
      const next = args[index + 1];
      if (next === undefined || next.startsWith('--')) {
        parsed.flags[key] = true;
      } else {
        parsed.flags[key] = next;
        index += 1;
      }
    } else {
      parsed.positional.push(value);
    }
  }
  return parsed;
}

function isDirectory(candidate) {
  try {
    return statSync(candidate).isDirectory();
  } catch {
    return false;
  }
}

function hasPath(root, relativePath) {
  return existsSync(path.join(root, relativePath));
}

export function scoreKnowledgeBaseRoot(candidate) {
  if (!isDirectory(candidate)) {
    return { path: candidate, score: 0, signals: [] };
  }

  const signals = [];
  let score = 0;

  if (path.basename(candidate) === 'code-kb') {
    score += 2;
    signals.push('name:code-kb');
  }
  if (hasPath(candidate, 'index.md')) {
    score += 3;
    signals.push('index.md');
  }
  if (hasPath(candidate, 'log.md')) {
    score += 3;
    signals.push('log.md');
  }
  if (hasPath(candidate, 'repos')) {
    score += 3;
    signals.push('repos/');
  }
  if (hasPath(candidate, 'global')) {
    score += 2;
    signals.push('global/');
  }
  for (const catalog of ['global/use-cases', 'global/domains', 'global/contracts']) {
    if (hasPath(candidate, catalog)) {
      score += 1;
      signals.push(`${catalog}/`);
    }
  }

  return { path: candidate, score, signals };
}

function looksLikeKnowledgeBase(candidate) {
  const scored = scoreKnowledgeBaseRoot(candidate);
  return scored.score >= 5 || scored.signals.includes('name:code-kb');
}

function ancestorsOf(start) {
  const ancestors = [];
  let current = path.resolve(start);
  while (true) {
    const parent = path.dirname(current);
    if (parent === current) return ancestors;
    ancestors.push(parent);
    current = parent;
  }
}

function childCodeKbCandidates(root) {
  if (!isDirectory(root)) return [];
  const candidates = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const candidate = path.join(root, entry.name, 'code-kb');
    if (isDirectory(candidate)) candidates.push(candidate);
  }
  return candidates;
}

function discoverKnowledgeBaseRoot({ cwd, mode }) {
  const resolvedCwd = path.resolve(cwd);
  const candidates = [];

  const cwdScore = scoreKnowledgeBaseRoot(resolvedCwd);
  if (looksLikeKnowledgeBase(resolvedCwd)) {
    return { kbRoot: resolvedCwd, reason: 'cwd', candidates: [cwdScore] };
  }
  candidates.push(cwdScore);

  const defaultRoot = path.join(resolvedCwd, 'code-kb');
  const defaultScore = scoreKnowledgeBaseRoot(defaultRoot);
  if (isDirectory(defaultRoot)) {
    return { kbRoot: defaultRoot, reason: 'cwd-code-kb', candidates: [defaultScore] };
  }
  candidates.push(defaultScore);

  for (const ancestor of ancestorsOf(resolvedCwd)) {
    const candidate = path.join(ancestor, 'code-kb');
    const scored = scoreKnowledgeBaseRoot(candidate);
    candidates.push(scored);
    if (isDirectory(candidate)) {
      return { kbRoot: candidate, reason: 'ancestor-code-kb', candidates: [scored] };
    }
  }

  const childCandidates = childCodeKbCandidates(resolvedCwd)
    .map(scoreKnowledgeBaseRoot)
    .sort((a, b) => b.score - a.score || a.path.localeCompare(b.path));
  if (childCandidates.length > 0) {
    return { kbRoot: childCandidates[0].path, reason: 'child-code-kb', candidates: childCandidates };
  }

  return {
    kbRoot: mode === 'write' ? defaultRoot : undefined,
    reason: mode === 'write' ? 'write-default' : 'not-found',
    candidates: candidates.filter((candidate) => candidate.score > 0),
  };
}

export function resolveContext({ cwd = process.cwd(), args = [], mode } = {}) {
  const parsed = parseArgs(args);
  const resolvedMode = parsed.flags.mode === 'read' || parsed.flags.mode === 'write'
    ? parsed.flags.mode
    : mode || 'write';
  const resolution = parsed.kbRoot
    ? {
      kbRoot: path.resolve(cwd, parsed.kbRoot),
      reason: 'explicit',
      candidates: [{ path: path.resolve(cwd, parsed.kbRoot), score: undefined, signals: ['--kb-root'] }],
    }
    : discoverKnowledgeBaseRoot({ cwd, mode: resolvedMode });
  return {
    workspaceRoot: cwd,
    kbRoot: resolution.kbRoot,
    resolution: {
      mode: resolvedMode,
      reason: resolution.reason,
      candidates: resolution.candidates,
    },
    json: parsed.json,
    limit: Number.isFinite(parsed.limit) && parsed.limit > 0 ? parsed.limit : 10,
    positional: parsed.positional,
    flags: parsed.flags,
  };
}
