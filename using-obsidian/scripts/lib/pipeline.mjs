import { existsSync, readFileSync } from 'node:fs';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { authoringDir } from './registry.mjs';

// 解析 candidate-flow markdown 表:取每个数据行的末列(状态列)。
// 数据行 = 以 | 开头、非分隔行(|---)、非表头(含"分析顺序")。
// 空表(无数据行)视为完成(vacuously true)。
export function tracksAllComplete(ledgerText, doneValue) {
  const rows = ledgerText.replace(/\r\n/g, '\n').split('\n')
    .map((l) => l.trim())
    .filter((l) => l.startsWith('|'))
    .filter((l) => !/^\|\s*-/.test(l))
    .filter((l) => !l.includes('分析顺序'));
  if (rows.length === 0) return true;
  for (const row of rows) {
    const cells = row.split('|').map((c) => c.trim());
    // 去掉首尾空单元(| a | b | → ['', 'a', 'b', ''])
    const trimmed = cells.filter((c, i) => !(c === '' && (i === 0 || i === cells.length - 1)));
    const last = trimmed[trimmed.length - 1];
    if (last !== doneValue) return false;
  }
  return true;
}
