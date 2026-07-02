import { buildIndex } from './index-build.mjs';
import { lintKnowledgeBase } from './lint.mjs';

export async function buildReport({ kbRoot }) {
  const index = await buildIndex({ kbRoot });
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
