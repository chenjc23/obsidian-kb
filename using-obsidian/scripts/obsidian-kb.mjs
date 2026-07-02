#!/usr/bin/env node

import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { runCli } from './lib/cli.mjs';

export { today, parseArgs, resolveContext } from './lib/context.mjs';
export {
  parseFrontmatter,
  parseSimpleYaml,
  stripQuotes,
  extractWikiLinks,
  arrayValue,
  normalizeTarget,
} from './lib/frontmatter.mjs';
export { collectMarkdownFiles, buildIndex } from './lib/index-build.mjs';
export { seedPage, SEED_FILES, initKnowledgeBase } from './lib/init.mjs';
export {
  REQUIRED_PROPERTIES,
  VALID_TYPES,
  VALID_CONFIDENCE,
  VALID_STATUS,
  lintKnowledgeBase,
} from './lib/lint.mjs';
export { buildReport } from './lib/query.mjs';
export { describe, describeData } from './lib/describe.mjs';
export { runCli, printResult } from './lib/cli.mjs';

const isMain = process.argv[1]
  && import.meta.url === pathToFileURL(fileURLToPath(import.meta.url)).href
  && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isMain) {
  runCli().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
