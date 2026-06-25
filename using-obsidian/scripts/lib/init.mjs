import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { today } from './context.mjs';

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

// init 只搭骨架：工作区视图目录 + index/log。唯一聚合页 system-architecture
// 由 ingest/update 在真有内容时才建，init 不预生成。依赖/影响面不物化成页（query 现算）。
const SEED_FILES = new Map([
  ['index.md', seedPage('Code Knowledge Base', 'index', 'meta', 'global', 'draft')],
  ['log.md', seedPage('Knowledge Base Log', 'log', 'meta', 'global', 'active')],
]);

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

export { seedPage, SEED_FILES };
