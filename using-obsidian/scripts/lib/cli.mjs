import { resolveContext } from './context.mjs';
import { initKnowledgeBase } from './init.mjs';
import { lintKnowledgeBase } from './lint.mjs';
import { buildReport } from './query.mjs';
import { scaffoldPage, scaffoldPartialContract, listTypes } from './scaffold.mjs';
import { describe, describeData } from './describe.mjs';
import { getPipeline, pipelineStatus, pipelineNext, markStageDone } from './pipeline.mjs';

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

const USAGE = 'node using-obsidian/scripts/obsidian-kb.mjs <resolve|init|lint|report|scaffold|types|describe|pipeline> [--kb-root <path>] [--json]\n'
  + '  describe [types|views|shapes|tree] [--json]   # 打印 registry 派生的结构视图\n'
  + '  scaffold <type> --repo <r> --title <t> [--topic <topic>] [--member <name>]  # 复合型(submodule/flow)须逐件 --member\n'
  + '  scaffold contract --partial --side <producer|consumer> --title <t> --known <repo> --evidence <e> [--missing-guess <repo>]\n'
  + '  pipeline <status|next|done <stage>> --repo <r> [--pipeline ingest|deep-analysis] [--topic <t>]';

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

  if (command === 'report') {
    printResult(await buildReport({ kbRoot: context.kbRoot }), context.json);
    return;
  }

  if (command === 'types') {
    printResult(listTypes(), context.json);
    return;
  }

  if (command === 'describe') {
    const section = context.positional[0];
    if (context.json) {
      const data = describeData();
      if (section && !(section in data)) throw new Error(`未知视图: ${section}（可选 ${Object.keys(data).join('|')}）`);
      console.log(JSON.stringify(section ? data[section] : data, null, 2));
    } else {
      console.log(describe({ section }));
    }
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
      type,
      repo: flags.repo,
      title: flags.title,
      topic: flags.topic,
      member: flags.member,
    });
    if (context.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      // 每条骨架:目标路径 + 逐行原样正文,agent 填好后 Write 到该路径。
      for (const sk of result.skeletons) {
        console.log(`# → 填好写入: ${sk.target}`);
        console.log(sk.content);
      }
    }
    return;
  }

  if (command === 'pipeline') {
    const sub = context.positional[0];
    const name = context.flags.pipeline || 'ingest';
    const pipeline = getPipeline(name);
    const ctx = {
      kbRoot: context.kbRoot,
      repo: context.flags.repo,
      topic: context.flags.topic,
      pipelineName: name,
    };
    if (sub === 'status') {
      printResult(await pipelineStatus(pipeline, ctx), context.json);
      return;
    }
    if (sub === 'next') {
      printResult(await pipelineNext(pipeline, ctx), context.json);
      return;
    }
    if (sub === 'done') {
      const stageId = context.positional[1];
      if (!stageId) throw new Error('pipeline done requires a stage id');
      await markStageDone(ctx.kbRoot, name, stageId);
      printResult({ marked: stageId, pipeline: name }, context.json);
      return;
    }
    throw new Error('pipeline requires a subcommand: status | next | done <stage>');
  }

  printResult({ usage: USAGE }, context.json);
}

export { printResult };
