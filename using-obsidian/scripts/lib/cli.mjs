import { resolveContext } from './context.mjs';
import { initKnowledgeBase } from './init.mjs';
import { lintKnowledgeBase } from './lint.mjs';
import { getLinks, searchKnowledgeBase, buildReport } from './query.mjs';
import { scaffoldPage, scaffoldPartialContract, listTypes } from './scaffold.mjs';
import { generateDocs } from './generate-docs.mjs';

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

const USAGE = 'node using-obsidian/scripts/obsidian-kb.mjs <resolve|init|lint|links|search|report|scaffold|types|generate-docs> [--kb-root <path>] [--limit <n>] [--json]\n'
  + '  scaffold <type> --repo <r> --title <t> [--topic <flow-topic>] [--force]\n'
  + '  scaffold contract --partial --side <producer|consumer> --title <t> --known <repo> --evidence <e> [--missing-guess <repo>]';

export async function runCli() {
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

  if (command === 'types') {
    printResult(listTypes(), context.json);
    return;
  }

  if (command === 'generate-docs') {
    const result = await generateDocs({ check: Boolean(context.flags.check) });
    printResult(result, context.json);
    if (context.flags.check && result.drift.length > 0) process.exitCode = 1;
    return;
  }

  if (command === 'scaffold') {
    const type = context.positional[0];
    if (!type) throw new Error('scaffold requires a type (see `types`)');
    const { flags } = context;
    if (type === 'contract' && flags.partial) {
      const result = await scaffoldPartialContract({
        kbRoot: context.kbRoot,
        title: flags.title,
        side: flags.side,
        known: flags.known,
        evidence: flags.evidence,
        missingGuess: flags['missing-guess'],
      });
      printResult(result, context.json);
      return;
    }
    const result = await scaffoldPage({
      kbRoot: context.kbRoot,
      type,
      repo: flags.repo,
      title: flags.title,
      topic: flags.topic,
      force: Boolean(flags.force),
    });
    printResult(result, context.json);
    return;
  }

  printResult({ usage: USAGE }, context.json);
}

export { printResult };
