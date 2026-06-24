#!/usr/bin/env node

import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// 枚举的唯一权威定义是 obsidian-kb-authoring/references/frontmatter-schema.md。
// 本脚本是它在代码里的投影，改 schema 时两边一起改。
const REQUIRED_PROPERTIES = ['title', 'type', 'repo', 'created', 'updated', 'confidence', 'status', 'sources'];
const VALID_TYPES = new Set([
  'use-case',
  'domain',
  'glossary',
  'flow',
  'candidate',
  'contract',
  'module',
  'architecture',
  'api-surface',
  'data-model',
  'config',
  'implementation',
  'runtime-notes',
  'risk',
  'index',
  'log',
  'extra',
]);
const VALID_VIEW = new Set(['usecase', 'logical', 'development', 'runtime', 'contract', 'impact', 'meta']);
const VALID_CONFIDENCE = new Set(['high', 'medium', 'low']);
const VALID_STATUS = new Set(['active', 'stale', 'draft', 'deprecated']);

// init 只搭骨架：工作区视图目录 + index/log。唯一聚合页 system-architecture
// 由 ingest/update 在真有内容时才建，init 不预生成。依赖/影响面不物化成页（query 现算）。
const SEED_FILES = new Map([
  ['index.md', seedPage('Code Knowledge Base', 'index', 'meta', 'global', 'draft')],
  ['log.md', seedPage('Knowledge Base Log', 'log', 'meta', 'global', 'active')],
]);

function today() {
  return new Date().toISOString().slice(0, 10);
}

function seedPage(title, type, view, repo, status = 'draft') {
  return `---
title: ${title}
type: ${type}
view: ${view}
repo: ${repo}
created: ${today()}
updated: ${today()}
sources: []
confidence: low
status: ${status}
---
# ${title}

> This page was initialized by the Obsidian KB helper. Replace this seed text with workspace knowledge.
`;
}

export function parseArgs(args = []) {
  const parsed = { positional: [], json: false, kbRoot: undefined, limit: 10 };
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
    } else {
      parsed.positional.push(value);
    }
  }
  return parsed;
}

export function resolveContext({ cwd = process.cwd(), args = [] } = {}) {
  const parsed = parseArgs(args);
  const kbRoot = parsed.kbRoot ? path.resolve(cwd, parsed.kbRoot) : path.join(cwd, 'code-kb');
  return {
    workspaceRoot: cwd,
    kbRoot,
    json: parsed.json,
    limit: Number.isFinite(parsed.limit) && parsed.limit > 0 ? parsed.limit : 10,
    positional: parsed.positional,
  };
}

export async function initKnowledgeBase({ kbRoot }) {
  await mkdir(kbRoot, { recursive: true });
  for (const directory of ['use-cases', 'domains', 'contracts', 'architecture', 'repos']) {
    await mkdir(path.join(kbRoot, directory), { recursive: true });
  }

  const created = [];
  for (const [relativePath, content] of SEED_FILES) {
    const fullPath = path.join(kbRoot, relativePath);
    await mkdir(path.dirname(fullPath), { recursive: true });
    if (!existsSync(fullPath)) {
      await writeFile(fullPath, content, 'utf8');
      created.push(relativePath);
    }
  }
  return { kbRoot, created };
}

export async function collectMarkdownFiles(root) {
  const files = [];

  async function walk(current) {
    if (!existsSync(current)) return;
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        files.push(fullPath);
      }
    }
  }

  await walk(root);
  return files.sort();
}

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

function parseSimpleYaml(raw) {
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

function stripQuotes(value) {
  return value.replace(/^['"]|['"]$/g, '');
}

export function extractWikiLinks(markdown) {
  const links = [];
  const regex = /!?\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|[^\]]+)?\]\]/g;
  for (const match of markdown.matchAll(regex)) {
    const target = match[1].trim();
    if (target) links.push(target);
  }
  return [...new Set(links)];
}

export async function buildIndex({ kbRoot, writeIndexes = true }) {
  const files = await collectMarkdownFiles(kbRoot);
  const pages = [];
  const incomingLinks = new Map();

  for (const fullPath of files) {
    const markdown = await readFile(fullPath, 'utf8');
    const relativePath = path.relative(kbRoot, fullPath).replace(/\\/g, '/');
    const parsed = parseFrontmatter(markdown);
    const page = {
      relativePath,
      title: parsed.data.title || path.basename(relativePath, '.md'),
      type: parsed.data.type || '',
      view: parsed.data.view || '',
      repo: parsed.data.repo || '',
      created: parsed.data.created || '',
      updated: parsed.data.updated || '',
      domain: arrayValue(parsed.data.domain),
      aliases: arrayValue(parsed.data.aliases),
      tags: arrayValue(parsed.data.tags),
      sources: arrayValue(parsed.data.sources),
      confidence: parsed.data.confidence || '',
      status: parsed.data.status || '',
      outgoingLinks: extractWikiLinks(markdown),
    };
    pages.push(page);
  }

  for (const page of pages) {
    for (const link of page.outgoingLinks) {
      const target = normalizeTarget(link);
      const incoming = incomingLinks.get(target) || [];
      incoming.push(page.relativePath);
      incomingLinks.set(target, incoming.sort());
    }
  }

  const index = { kbRoot, pages, incomingLinks };
  // `writeIndexes` is retained for backward-compatible callers. The helper now
  // keeps indexes transient so this never creates Markdown index pages.
  void writeIndexes;
  return index;
}

function arrayValue(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null || value === '') return [];
  return [value];
}

function normalizeTarget(target) {
  const normalized = target.replace(/\\/g, '/').replace(/^\.\//, '');
  return normalized.endsWith('.md') ? normalized : `${normalized}.md`;
}

export async function lintKnowledgeBase({ kbRoot }) {
  const index = await buildIndex({ kbRoot, writeIndexes: false });
  const issues = [];
  const existingPages = new Set(index.pages.map((page) => page.relativePath));

  for (const page of index.pages) {
    for (const property of REQUIRED_PROPERTIES) {
      const value = page[property];
      if (value === undefined || value === '') {
        issues.push({
          severity: 'error',
          type: 'frontmatter',
          page: page.relativePath,
          message: `Missing required property: ${property}`,
        });
      }
    }

    if (page.confidence && !VALID_CONFIDENCE.has(page.confidence)) {
      issues.push({
        severity: 'error',
        type: 'frontmatter',
        page: page.relativePath,
        message: `Invalid confidence: ${page.confidence}`,
      });
    }

    if (page.type && !VALID_TYPES.has(page.type)) {
      issues.push({
        severity: 'error',
        type: 'frontmatter',
        page: page.relativePath,
        message: `Invalid type: ${page.type}`,
      });
    }

    if (page.view && !VALID_VIEW.has(page.view)) {
      issues.push({
        severity: 'error',
        type: 'frontmatter',
        page: page.relativePath,
        message: `Invalid view: ${page.view}`,
      });
    }

    if (page.status && !VALID_STATUS.has(page.status)) {
      issues.push({
        severity: 'error',
        type: 'frontmatter',
        page: page.relativePath,
        message: `Invalid status: ${page.status}`,
      });
    }

    for (const link of page.outgoingLinks) {
      const target = normalizeTarget(link);
      if (!existingPages.has(target)) {
        issues.push({
          severity: 'warning',
          type: 'broken-link',
          page: page.relativePath,
          target,
          message: `Broken wikilink: ${link}`,
        });
      }
    }

    const incoming = index.incomingLinks.get(page.relativePath) || [];
    if (incoming.length === 0 && page.outgoingLinks.length === 0 && !isIntentionalEntryPage(page.relativePath)) {
      issues.push({
        severity: 'warning',
        type: 'orphan',
        page: page.relativePath,
        message: 'Page has no incoming or outgoing wikilinks',
      });
    }

    if (page.type === 'flow') {
      if (page.domain.length === 0) {
        issues.push({
          severity: 'warning',
          type: 'flow-linkage',
          page: page.relativePath,
          message: 'Flow page is missing domain metadata',
        });
      }
      if (!page.outgoingLinks.some((link) => link.startsWith('contracts/') || link.includes('/modules/'))) {
        issues.push({
          severity: 'warning',
          type: 'flow-linkage',
          page: page.relativePath,
          message: 'Flow page should link related contracts or modules',
        });
      }
    }

    if (page.type === 'contract') {
      if (!page.outgoingLinks.some((link) => link.startsWith('repos/'))) {
        issues.push({
          severity: 'warning',
          type: 'contract-linkage',
          page: page.relativePath,
          message: 'Contract page should link producer or consumer repo/module pages',
        });
      }
    }
  }

  return { kbRoot, issues };
}

function isIntentionalEntryPage(relativePath) {
  return ['index.md', 'log.md'].includes(relativePath);
}

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

function printResult(result, json) {
  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else if (Array.isArray(result)) {
    for (const item of result) console.log(item);
  } else if (result && typeof result === 'object') {
    for (const [key, value] of Object.entries(result)) {
      if (Array.isArray(value)) {
        console.log(`${key}: ${value.length}`);
        for (const item of value) console.log(`  - ${typeof item === 'string' ? item : JSON.stringify(item)}`);
      } else if (value && typeof value === 'object') {
        console.log(`${key}: ${JSON.stringify(value)}`);
      } else {
        console.log(`${key}: ${value}`);
      }
    }
  } else {
    console.log(String(result));
  }
}

async function runCli() {
  const [command = 'help', ...rest] = process.argv.slice(2);
  const context = resolveContext({ args: rest });

  if (command === 'resolve') {
    printResult(context, context.json);
    return;
  }

  if (command === 'init') {
    printResult(await initKnowledgeBase({ kbRoot: context.kbRoot }), context.json);
    return;
  }

  if (command === 'lint') {
    printResult(await lintKnowledgeBase({ kbRoot: context.kbRoot }), context.json);
    return;
  }

  if (command === 'links') {
    const target = context.positional[0];
    if (!target) throw new Error('links requires a target');
    printResult(await getLinks({ kbRoot: context.kbRoot, target }), context.json);
    return;
  }

  if (command === 'search') {
    const query = context.positional.join(' ');
    if (!query) throw new Error('search requires a query');
    printResult(await searchKnowledgeBase({ kbRoot: context.kbRoot, query, limit: context.limit }), context.json);
    return;
  }

  if (command === 'report') {
    printResult(await buildReport({ kbRoot: context.kbRoot }), context.json);
    return;
  }

  printResult({
    usage: 'node skills/using-obsidian/scripts/obsidian-kb.mjs <resolve|init|lint|links|search|report> [--kb-root <path>] [--limit <n>] [--json]',
  }, context.json);
}

const isMain = process.argv[1]
  && import.meta.url === pathToFileURL(fileURLToPath(import.meta.url)).href
  && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isMain) {
  runCli().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
