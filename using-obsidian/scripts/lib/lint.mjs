import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { buildIndex } from './index-build.mjs';
import { normalizeTarget, parseFrontmatter } from './frontmatter.mjs';
import { requiredSections } from './template.mjs';

// 枚举的唯一权威定义是 obsidian-kb-authoring/references/frontmatter-schema.md。
// 本文件是它在代码里的投影，改 schema 时两边一起改。
export const REQUIRED_PROPERTIES = ['title', 'type', 'repo', 'created', 'updated', 'confidence', 'status', 'sources'];
export const VALID_TYPES = new Set([
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
  'coverage',
  'extra',
]);
export const VALID_VIEW = new Set(['usecase', 'logical', 'development', 'runtime', 'contract', 'impact', 'meta']);
export const VALID_CONFIDENCE = new Set(['high', 'medium', 'low']);
export const VALID_STATUS = new Set(['active', 'partial', 'draft', 'deprecated']);

function isIntentionalEntryPage(relativePath) {
  return ['index.md', 'log.md'].includes(relativePath);
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
      if (!page.outgoingLinks.some((link) => link.startsWith('global/contracts/') || link.includes('/modules/'))) {
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

    // 模板符合度：页正文缺模板必需 `## section` 报 warning。
    // 未知 type（无模板）跳过，flow 这里不判（flowFile 维度由 scaffold 保证）。
    let required;
    try {
      required = page.type && page.type !== 'flow' ? requiredSections(page.type) : [];
    } catch {
      required = [];
    }
    if (required.length > 0) {
      const body = parseFrontmatter(await readFile(path.join(kbRoot, page.relativePath), 'utf8')).body;
      const present = new Set(
        body.split('\n')
          .map((line) => line.match(/^##\s+(.+?)\s*$/))
          .filter(Boolean)
          .map((m) => m[1].trim()),
      );
      for (const section of required) {
        if (!present.has(section)) {
          issues.push({
            severity: 'warning',
            type: 'template',
            page: page.relativePath,
            message: `Missing template-required section: ## ${section}`,
          });
        }
      }
    }
  }

  return { kbRoot, issues };
}
