import { existsSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

import { parseFrontmatter, extractWikiLinks, arrayValue, normalizeTarget } from './frontmatter.mjs';

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

export async function buildIndex({ kbRoot }) {
  const files = await collectMarkdownFiles(kbRoot);
  const pages = [];
  const incomingLinks = new Map();

  for (const fullPath of files) {
    const markdown = await readFile(fullPath, 'utf8');
    const relativePath = path.relative(kbRoot, fullPath).replace(/\\/g, '/');
    const parsed = parseFrontmatter(markdown);
    const page = {
      ...parsed.data,
      relativePath,
      title: parsed.data.title || path.basename(relativePath, '.md'),
      type: parsed.data.type || '',
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
      data: parsed.data,
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
  return index;
}
