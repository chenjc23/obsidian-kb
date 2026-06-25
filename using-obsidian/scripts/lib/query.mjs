import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { parseFrontmatter, extractWikiLinks, arrayValue, normalizeTarget } from './frontmatter.mjs';
import { collectMarkdownFiles, buildIndex } from './index-build.mjs';
import { lintKnowledgeBase } from './lint.mjs';

export async function getLinks({ kbRoot, target }) {
  const index = await buildIndex({ kbRoot, writeIndexes: false });
  const normalizedTarget = normalizeTarget(target);
  const page = index.pages.find((candidate) => candidate.relativePath === normalizedTarget);
  return {
    kbRoot,
    target: normalizedTarget,
    incoming: index.incomingLinks.get(normalizedTarget) || [],
    outgoing: page ? page.outgoingLinks.map(normalizeTarget) : [],
  };
}

export async function searchKnowledgeBase({ kbRoot, query, limit = 10 }) {
  const terms = tokenizeQuery(query);
  const files = await collectMarkdownFiles(kbRoot);
  const results = [];

  for (const fullPath of files) {
    const markdown = await readFile(fullPath, 'utf8');
    const relativePath = path.relative(kbRoot, fullPath).replace(/\\/g, '/');
    const parsed = parseFrontmatter(markdown);
    const page = {
      relativePath,
      title: parsed.data.title || path.basename(relativePath, '.md'),
      type: parsed.data.type || '',
      repo: parsed.data.repo || '',
      domain: arrayValue(parsed.data.domain),
      aliases: arrayValue(parsed.data.aliases),
      tags: arrayValue(parsed.data.tags),
      sources: arrayValue(parsed.data.sources),
      confidence: parsed.data.confidence || '',
      status: parsed.data.status || '',
      outgoingLinks: extractWikiLinks(markdown),
    };
    const scored = scorePage(page, parsed.body, terms);
    if (scored.score > 0) {
      results.push({ ...page, score: scored.score, matches: scored.matches, excerpt: makeExcerpt(parsed.body, terms) });
    }
  }

  results.sort((a, b) => b.score - a.score || a.relativePath.localeCompare(b.relativePath));
  return { kbRoot, query, results: results.slice(0, limit) };
}

function tokenizeQuery(query) {
  return [...new Set(String(query)
    .toLowerCase()
    .split(/[^\p{L}\p{N}_./:-]+/u)
    .map((term) => term.trim())
    .filter(Boolean))];
}

function scorePage(page, body, terms) {
  const matches = [];
  let score = 0;

  for (const term of terms) {
    const weightedFields = [
      ['title', page.title, 12],
      ['aliases', page.aliases.join(' '), 10],
      ['relativePath', page.relativePath, 8],
      ['domain', page.domain.join(' '), 7],
      ['tags', page.tags.join(' '), 5],
      ['sources', page.sources.join(' '), 5],
      ['links', page.outgoingLinks.join(' '), 3],
      ['body', body, 1],
    ];

    for (const [field, rawValue, weight] of weightedFields) {
      const value = String(rawValue).toLowerCase();
      if (value.includes(term)) {
        score += weight;
        matches.push(`${field}:${term}`);
      }
    }
  }

  if (page.status === 'stale') score -= 2;
  if (page.confidence === 'high') score += 2;
  if (page.confidence === 'low') score -= 1;

  return { score, matches: [...new Set(matches)] };
}

function makeExcerpt(body, terms) {
  const normalized = body.replace(/\s+/g, ' ').trim();
  if (!normalized) return '';
  const lower = normalized.toLowerCase();
  const firstHit = terms
    .map((term) => lower.indexOf(term))
    .filter((index) => index >= 0)
    .sort((a, b) => a - b)[0] ?? 0;
  const start = Math.max(0, firstHit - 80);
  return normalized.slice(start, start + 220);
}

export async function buildReport({ kbRoot }) {
  const index = await buildIndex({ kbRoot, writeIndexes: false });
  const lint = await lintKnowledgeBase({ kbRoot });
  const byType = countBy(index.pages, 'type');
  const byConfidence = countBy(index.pages, 'confidence');
  return {
    kbRoot,
    pageCount: index.pages.length,
    issueCount: lint.issues.length,
    byType,
    byConfidence,
  };
}

function countBy(items, key) {
  const counts = {};
  for (const item of items) {
    const value = item[key] || 'unknown';
    counts[value] = (counts[value] || 0) + 1;
  }
  return counts;
}
