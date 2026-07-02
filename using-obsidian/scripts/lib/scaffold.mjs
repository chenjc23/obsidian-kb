import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import {
  loadTemplate,
  fillMechanical,
  targetPath,
  MEMBER_FILES,
} from './template.mjs';
import { scaffoldableTypes } from './registry.mjs';

// 吐骨架文本,不落盘:agent 填好正文后自己 Write 到 target。
// 文件只在被填好时才出现在磁盘,`exists` 闸门因此可信。
// 复合型逐件吐:写哪件传 --member 吐哪件,不一次吐全套。
export async function scaffoldPage({ type, repo, title, topic, member }) {
  const members = MEMBER_FILES[type] || [];
  if (members.length > 0) {
    if (!member || !members.includes(member)) {
      throw new Error(`${type} 需指定成员 --member <${members.join('|')}>`);
    }
    const target = targetPath(type, { repo, topic, member });
    validateTargetInputs(target, { repo, title, topic });
    return {
      skeletons: [{
        target,
        content: fillMechanical(loadTemplate(type, member), { title: title || topic, repo }),
      }],
    };
  }
  const target = targetPath(type, { repo, title, topic });
  validateTargetInputs(target, { repo, title, topic });
  return {
    skeletons: [{
      target,
      content: fillMechanical(loadTemplate(type), { title, repo }),
    }],
  };
}

function validateTargetInputs(target, { repo, title, topic }) {
  if (target.includes('repos/') && !repo) {
    throw new Error('scaffold target requires --repo <repo>');
  }
  if (target.includes('{title}') && !title) {
    throw new Error('scaffold target requires --title <title>');
  }
  if (target.includes('/submodules//') || target.includes('/flows//') || /\/(submodules|flows)\/\.md$/.test(target)) {
    throw new Error('scaffold target requires --topic <topic>');
  }
}

async function writeFileAt(kbRoot, relativePath, content) {
  const full = path.join(kbRoot, relativePath);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, content, 'utf8');
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
  await writeFileAt(kbRoot, contractPath, page);

  // 2) 确保 coverage.md 存在。
  const coveragePath = targetPath('coverage', {});
  const coverageFull = path.join(kbRoot, coveragePath);
  if (!existsSync(coverageFull)) {
    await writeFileAt(kbRoot, coveragePath, fillMechanical(loadTemplate('coverage'), {}));
  }

  // 3) 在「待接合的跨仓边」表后 append 一行。
  const missingCell = missingGuess ? `对端未知（疑在 ${missingGuess}）` : '对端未知';
  const coverageRow = `| ${title} | ${side}: ${known} | ${missingCell} | ${evidence} | [[global/contracts/${title}]] | 待接合 |`;
  const current = await readFile(coverageFull, 'utf8');
  const updated = appendHangingRow(current, coverageRow);
  await writeFile(coverageFull, updated, 'utf8');

  return { created: [contractPath, coveragePath], coverageRow };
}

// 在「待接合的跨仓边」表头分隔行（|---|...）之后插入新行；占位注释保留在表尾。
function appendHangingRow(markdown, row) {
  const lines = markdown.split('\n');
  let headerIdx = -1;
  for (let i = 0; i < lines.length; i += 1) {
    if (/待接合的跨仓边/.test(lines[i])) {
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
  return scaffoldableTypes();
}
