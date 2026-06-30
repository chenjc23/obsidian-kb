import { resolveContext } from './context.mjs';
import { initKnowledgeBase } from './init.mjs';
import { lintKnowledgeBase } from './lint.mjs';
import { inspectCandidateFlow, markCandidateFlowDone } from './candidate-flow.mjs';
import { getLinks, searchKnowledgeBase, buildReport } from './query.mjs';
import { scaffoldPage, scaffoldPartialContract, listTypes } from './scaffold.mjs';

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

const USAGE = 'node using-obsidian/scripts/obsidian-kb.mjs <resolve|init|lint|links|search|report|queue|scaffold|types> [--kb-root <path>] [--limit <n>] [--json]\n'
  + '  queue --repo <r> [--mark-done <flow-name>]\n'
  + '  scaffold <type> --repo <r> --title <t> [--topic <flow-topic>] [--force]\n'
  + '  scaffold contract --partial --side <producer|consumer> --title <t> --known <repo> --evidence <e> [--missing-guess <repo>]';

export async function runCli() {
  const [command = 'help', ...rest] = process.argv.slice(2);
  const writeCommands = new Set(['init', 'scaffold']);
  const context = resolveContext({ args: rest, mode: writeCommands.has(command) ? 'write' : 'read' });

  if (command === 'resolve') {
    printResult(context, context.json);
    return;
  }

  if (command === 'init') {
    printResult(await initKnowledgeBase({ kbRoot: context.kbRoot }), context.json);
    return;
  }

  if (command === 'lint') {
    if (!context.kbRoot) throw new Error('No knowledge base root found. Pass --kb-root or run init for write-oriented setup.');
    printResult(await lintKnowledgeBase({ kbRoot: context.kbRoot }), context.json);
    return;
  }

  if (command === 'links') {
    if (!context.kbRoot) throw new Error('No knowledge base root found. Pass --kb-root or run init for write-oriented setup.');
    const target = context.positional[0];
    if (!target) throw new Error('links requires a target');
    printResult(await getLinks({ kbRoot: context.kbRoot, target }), context.json);
    return;
  }

  if (command === 'search') {
    if (!context.kbRoot) throw new Error('No knowledge base root found. Pass --kb-root or run init for write-oriented setup.');
    const query = context.positional.join(' ');
    if (!query) throw new Error('search requires a query');
    printResult(await searchKnowledgeBase({ kbRoot: context.kbRoot, query, limit: context.limit }), context.json);
    return;
  }

  if (command === 'report') {
    if (!context.kbRoot) throw new Error('No knowledge base root found. Pass --kb-root or run init for write-oriented setup.');
    printResult(await buildReport({ kbRoot: context.kbRoot }), context.json);
    return;
  }

  if (command === 'queue') {
    if (!context.kbRoot) throw new Error('No knowledge base root found. Pass --kb-root or run init for write-oriented setup.');
    const { flags } = context;
    if (!flags.repo) throw new Error('queue requires --repo <repo>');
    const result = flags['mark-done']
      ? await markCandidateFlowDone({ kbRoot: context.kbRoot, repo: flags.repo, flowName: flags['mark-done'] })
      : await inspectCandidateFlow({ kbRoot: context.kbRoot, repo: flags.repo });
    printResult(result, context.json);
    return;
  }

  if (command === 'types') {
    printResult(listTypes(), context.json);
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
