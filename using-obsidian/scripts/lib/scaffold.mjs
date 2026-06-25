import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import {
  loadTemplate,
  fillMechanical,
  targetPath,
  FLOW_FILES,
  TYPE_FILE,
} from './template.mjs';

async function writeIfAbsent({ kbRoot, relativePath, content, force }) {
  const fullPath = path.join(kbRoot, relativePath);
  if (existsSync(fullPath) && !force) {
    return { written: false, relativePath };
  }
  await mkdir(path.dirname(fullPath), { recursive: true });
  await writeFile(fullPath, content, 'utf8');
  return { written: true, relativePath };
}

export async function scaffoldPage({ kbRoot, type, repo, title, topic, force = false }) {
  const created = [];
  const skipped = [];

  const targets = type === 'flow'
    ? FLOW_FILES.map((flowFile) => ({
      relativePath: targetPath('flow', { repo, topic, flowFile }),
      content: fillMechanical(loadTemplate('flow', flowFile), { title: title || topic, repo }),
    }))
    : [{
      relativePath: targetPath(type, { repo, title, topic }),
      content: fillMechanical(loadTemplate(type), { title, repo }),
    }];

  for (const t of targets) {
    const res = await writeIfAbsent({ kbRoot, relativePath: t.relativePath, content: t.content, force });
    if (res.written) created.push(res.relativePath);
    else skipped.push(res.relativePath);
  }

  return { created, skipped };
}

export async function scaffoldPartialContract({ kbRoot, title, side, known, evidence, missingGuess }) {
  if (side !== 'producer' && side !== 'consumer') {
    throw new Error('side 须为 producer 或 consumer');
  }

  // 1) 建 partial 契约页：填已知一端、status: partial、另一端留空。
  let page = fillMechanical(loadTemplate('contract'), { title });
  const nl = page.includes('\r\n') ? '\r\n' : '\n';
  page = page.replace(/^status: .*$/m, 'status: partial');
  // 模板可能是 CRLF，行间断必须容忍 \r。
  const sideLine = new RegExp(`^${side}:\\r?\\n  - .*$`, 'm');
  page = page.replace(sideLine, `${side}:${nl}  - ${known}`);
  const contractPath = targetPath('contract', { title });
  await writeIfAbsent({ kbRoot, relativePath: contractPath, content: page, force: true });

  // 2) 确保 coverage.md 存在。
  const coveragePath = targetPath('coverage', {});
  const coverageFull = path.join(kbRoot, coveragePath);
  if (!existsSync(coverageFull)) {
    await writeIfAbsent({
      kbRoot,
      relativePath: coveragePath,
      content: fillMechanical(loadTemplate('coverage'), {}),
      force: false,
    });
  }

  // 3) 在「悬挂的跨仓边」表后 append 一行。
  const missingCell = missingGuess ? `对端未知（疑在 ${missingGuess}）` : '对端未知';
  const coverageRow = `| ${title} | ${side}: ${known} | ${missingCell} | ${evidence} | [[contracts/${title}]] | 悬挂 |`;
  const current = await readFile(coverageFull, 'utf8');
  const updated = appendHangingRow(current, coverageRow);
  await writeFile(coverageFull, updated, 'utf8');

  return { created: [contractPath, coveragePath], coverageRow };
}

// 在「悬挂的跨仓边」表头分隔行（|---|...）之后插入新行；占位注释保留在表尾。
function appendHangingRow(markdown, row) {
  const lines = markdown.split('\n');
  let headerIdx = -1;
  for (let i = 0; i < lines.length; i += 1) {
    if (/悬挂的跨仓边/.test(lines[i])) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx === -1) {
    return `${markdown.replace(/\n*$/, '')}\n\n${row}\n`;
  }
  // 找该 section 下的分隔行 |---|
  let sepIdx = -1;
  for (let i = headerIdx + 1; i < lines.length; i += 1) {
    if (/^\|\s*-/.test(lines[i])) {
      sepIdx = i;
      break;
    }
    if (/^##\s/.test(lines[i])) break;
  }
  if (sepIdx === -1) {
    return `${markdown.replace(/\n*$/, '')}\n\n${row}\n`;
  }
  lines.splice(sepIdx + 1, 0, row);
  return lines.join('\n');
}

export function listTypes() {
  const types = new Set(Object.keys(TYPE_FILE));
  types.add('flow');
  return [...types].sort();
}
