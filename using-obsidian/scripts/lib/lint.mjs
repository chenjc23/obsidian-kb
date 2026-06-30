import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { buildIndex } from './index-build.mjs';
import { normalizeTarget, parseFrontmatter } from './frontmatter.mjs';
import { requiredSections } from './template.mjs';
import { parseCandidateFlowTable, validateCandidateFlows } from './candidate-flow.mjs';

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
export const VALID_CONFIDENCE = new Set(['high', 'medium', 'low']);
export const VALID_STATUS = new Set(['active', 'partial', 'draft', 'deprecated']);

function isIntentionalEntryPage(relativePath) {
  return ['index.md', 'log.md'].includes(relativePath);
}

function relationTarget(field, value, page) {
  if (!value) return undefined;
  if (value.startsWith('repos/') || value.startsWith('global/')) return normalizeTarget(value);
  if (field === 'related-contracts') return normalizeTarget(`global/contracts/${value}`);
  if (field === 'related-modules' || field === 'depends-on') {
    const parts = value.split('/').filter(Boolean);
    if (parts.length >= 2) return normalizeTarget(`repos/${parts[0]}/modules/${parts.slice(1).join('/')}`);
    if (page.repo) return normalizeTarget(`repos/${page.repo}/modules/${value}`);
  }
  if (field === 'related-flows') return normalizeTarget(value);
  return undefined;
}

function hasOutgoingTo(page, target) {
  return page.outgoingLinks.map(normalizeTarget).includes(target);
}

function coverageContainsContract(markdown, pagePath) {
  if (!markdown) return false;
  const withoutExt = pagePath.replace(/\.md$/, '');
  return markdown.includes(`[[${withoutExt}]]`) || markdown.includes(`[[${pagePath}]]`);
}

function stripComments(markdown) {
  return markdown.replace(/<!--[\s\S]*?-->/g, '');
}

function flowFolderOf(relativePath) {
  const match = relativePath.match(/^repos\/([^/]+)\/flows\/([^/]+)\/([^/]+\.md)$/);
  if (!match) return undefined;
  return {
    repo: match[1],
    topic: match[2],
    file: match[3],
    folder: `repos/${match[1]}/flows/${match[2]}`,
  };
}

export async function lintKnowledgeBase({ kbRoot }) {
  const index = await buildIndex({ kbRoot, writeIndexes: false });
  const issues = [];
  const existingPages = new Set(index.pages.map((page) => page.relativePath));
  const pagesByPath = new Map(index.pages.map((page) => [page.relativePath, page]));
  const coveragePath = 'global/architecture/coverage.md';
  const coverageMarkdown = existingPages.has(coveragePath)
    ? await readFile(path.join(kbRoot, coveragePath), 'utf8')
    : '';

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
      } else if (page.type !== 'glossary' && !isIntentionalEntryPage(page.relativePath)) {
        const targetPage = pagesByPath.get(target);
        if (targetPage && !hasOutgoingTo(targetPage, page.relativePath)) {
          issues.push({
            severity: 'warning',
            type: 'reciprocal-link',
            page: page.relativePath,
            target,
            message: `Missing reciprocal wikilink from ${target} back to ${page.relativePath}`,
          });
        }
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
      if (page.entryPoint.length === 0) {
        issues.push({
          severity: 'warning',
          type: 'relation-metadata',
          page: page.relativePath,
          message: 'Flow page is missing entry-point metadata',
        });
      }
      if (page.relatedContracts.length === 0) {
        issues.push({
          severity: 'warning',
          type: 'relation-metadata',
          page: page.relativePath,
          message: 'Flow page is missing related-contracts metadata',
        });
      }
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
      if (page.status === 'active') {
        for (const side of ['producer', 'consumer']) {
          if (page[side].length === 0) {
            issues.push({
              severity: 'warning',
              type: 'contract-linkage',
              page: page.relativePath,
              message: `Active contract is missing ${side}`,
            });
          }
        }
      }
      if (page.status === 'partial') {
        const knownSideCount = Number(page.producer.length > 0) + Number(page.consumer.length > 0);
        if (knownSideCount !== 1) {
          issues.push({
            severity: 'warning',
            type: 'partial-contract',
            page: page.relativePath,
            message: 'Partial contract should have exactly one known side',
          });
        }
        if (!coverageContainsContract(coverageMarkdown, page.relativePath)) {
          issues.push({
            severity: 'warning',
            type: 'partial-coverage',
            page: page.relativePath,
            target: coveragePath,
            message: 'Partial contract is missing a coverage待接合 row',
          });
        }
      }
      if (!page.outgoingLinks.some((link) => link.startsWith('repos/'))) {
        issues.push({
          severity: 'warning',
          type: 'contract-linkage',
          page: page.relativePath,
          message: 'Contract page should link producer or consumer repo/module pages',
        });
      }
    }

    if (page.type === 'module' && page.dependsOn.length === 0) {
      issues.push({
        severity: 'warning',
        type: 'relation-metadata',
        page: page.relativePath,
        message: 'Module page is missing depends-on metadata',
      });
    }

    for (const [field, values] of [
      ['depends-on', page.dependsOn],
      ['related-contracts', page.relatedContracts],
      ['related-flows', page.relatedFlows],
      ['related-modules', page.relatedModules],
    ]) {
      for (const value of values) {
        const target = relationTarget(field, value, page);
        if (!target) continue;
        if (!existingPages.has(target)) {
          issues.push({
            severity: 'warning',
            type: 'relation-target',
            page: page.relativePath,
            target,
            message: `Relation field ${field} points to missing page: ${value}`,
          });
        } else if (!hasOutgoingTo(page, target)) {
          issues.push({
            severity: 'warning',
            type: 'relation-body-link',
            page: page.relativePath,
            target,
            message: `Relation field ${field} should have a matching wikilink in the body`,
          });
        }
      }
    }

    if (page.type === 'candidate') {
      const markdown = await readFile(path.join(kbRoot, page.relativePath), 'utf8');
      for (const issue of validateCandidateFlows(parseCandidateFlowTable(markdown))) {
        issues.push({
          severity: 'warning',
          type: `candidate-${issue.type}`,
          page: page.relativePath,
          message: issue.message,
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

  const flowFolders = new Map();
  for (const page of index.pages) {
    const flow = flowFolderOf(page.relativePath);
    if (!flow) continue;
    const pages = flowFolders.get(flow.folder) || [];
    pages.push({ ...flow, page });
    flowFolders.set(flow.folder, pages);
  }

  for (const [folder, entries] of flowFolders) {
    const files = new Set(entries.map((entry) => entry.file));
    for (const required of ['调用树.md', '主干流程.md', '自查报告.md']) {
      if (!files.has(required)) {
        issues.push({
          severity: 'warning',
          type: 'flow-folder',
          page: folder,
          message: `Deep flow folder is missing ${required}`,
        });
      }
    }

    for (const entry of entries) {
      const markdown = await readFile(path.join(kbRoot, entry.page.relativePath), 'utf8');
      const visible = stripComments(markdown);
      if (/<!--\s*填:|confidence:\s*<!--|sources:\s*\n\s*-\s*<!--/.test(markdown)) {
        issues.push({
          severity: 'warning',
          type: 'flow-placeholder',
          page: entry.page.relativePath,
          message: 'Deep flow page still contains scaffold placeholders',
        });
      }
      if (/(?:\.\.\.|…|类似|同理|以此类推|此处省略|等等)/.test(visible)) {
        issues.push({
          severity: 'warning',
          type: 'flow-shortcut',
          page: entry.page.relativePath,
          message: 'Deep flow page contains shortcut wording that can hide uncovered paths',
        });
      }
    }
  }

  return { kbRoot, issues };
}
