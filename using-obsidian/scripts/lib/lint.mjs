import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { buildIndex } from './index-build.mjs';
import { normalizeTarget, parseFrontmatter, arrayValue } from './frontmatter.mjs';
import { requiredSections } from './template.mjs';
import {
  loadRegistry, requiredFrontmatter, validTypes, validConfidence, validStatus,
} from './registry.mjs';

// 枚举/字段的唯一权威定义是 obsidian-kb-authoring/registry.yaml；以下为其投影。
export const REQUIRED_PROPERTIES = requiredFrontmatter();
export const VALID_TYPES = validTypes();
export const VALID_CONFIDENCE = new Set(validConfidence());
export const VALID_STATUS = new Set(validStatus());

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

    // 数据化 linkage：needField=该 frontmatter 字段非空；needLink=任一出链含任一子串。
    // 一条规则任一谓词满足即通过。
    const def = loadRegistry().types[page.type];
    if (def && Array.isArray(def.linkage)) {
      for (const rule of def.linkage) {
        let pass = false;
        if (rule.needField) {
          pass = arrayValue(page[rule.needField]).length > 0;
        }
        if (!pass && Array.isArray(rule.needLink)) {
          pass = page.outgoingLinks.some((l) => rule.needLink.some((s) => l.includes(s)));
        }
        if (!pass) {
          issues.push({
            severity: 'warning',
            type: 'linkage',
            page: page.relativePath,
            message: rule.message,
          });
        }
      }
    }

    // 模板符合度：页正文缺模板必需 `## section` 报 warning。
    // 只判"有独立模板"的页型；复合型（flow/submodule 等，成员维度由 scaffold 保证）、
    // meta/未知型无 template，一律跳过。
    let required = [];
    if (def && def.template) {
      try {
        required = requiredSections(page.type);
      } catch {
        required = [];
      }
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
