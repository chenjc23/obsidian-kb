import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const VALID_FLOW_STATUS = new Set(['待深挖', '已深挖']);

function candidatePath(repo) {
  return `repos/${repo}/candidate-flow.md`;
}

function splitRow(line) {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

function isTableRow(line) {
  return /^\s*\|/.test(line) && !/^\s*\|\s*-/.test(line);
}

export function parseCandidateFlowTable(markdown) {
  const rows = [];
  const lines = markdown.split('\n');
  const headerIndex = lines.findIndex((line) => /\|\s*分析顺序\s*\|/.test(line));
  if (headerIndex === -1) return rows;

  for (let index = headerIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.trim() || line.trim().startsWith('<!--')) continue;
    if (!isTableRow(line)) {
      if (/^##\s/.test(line)) break;
      continue;
    }

    const cells = splitRow(line);
    if (cells.length < 12) continue;
    rows.push({
      order: Number.parseInt(cells[0], 10),
      name: cells[1],
      entry: cells[2],
      trigger: cells[3],
      modules: cells[4],
      crossBoundary: cells[5],
      risk: cells[6],
      reason: cells[7],
      evidence: cells[8],
      reachability: cells[9],
      confidence: cells[10],
      status: cells[11],
      lineIndex: index,
      cells,
    });
  }
  return rows;
}

export function validateCandidateFlows(flows) {
  const issues = [];
  const orders = flows.map((flow) => flow.order).filter(Number.isFinite).sort((a, b) => a - b);
  const seen = new Set();
  for (const order of orders) {
    if (seen.has(order)) {
      issues.push({ type: 'duplicate-order', message: `Duplicate analysis order: ${order}` });
    }
    seen.add(order);
  }

  orders.forEach((order, index) => {
    const expected = index + 1;
    if (order !== expected) {
      issues.push({ type: 'order-gap', message: `Analysis order should be continuous; expected ${expected}, got ${order}` });
    }
  });

  for (const flow of flows) {
    if (!VALID_FLOW_STATUS.has(flow.status)) {
      issues.push({
        type: 'invalid-status',
        flow: flow.name,
        message: `Invalid candidate-flow status: ${flow.status || '(empty)'}`,
      });
    }
  }

  return issues;
}

export async function inspectCandidateFlow({ kbRoot, repo }) {
  if (!repo) throw new Error('repo is required');
  const relativePath = candidatePath(repo);
  const markdown = await readFile(path.join(kbRoot, relativePath), 'utf8');
  const flows = parseCandidateFlowTable(markdown).sort((a, b) => a.order - b.order);
  const issues = validateCandidateFlows(flows);
  const nextFlow = flows.find((flow) => flow.status !== '已深挖') || null;
  return {
    kbRoot,
    repo,
    path: relativePath,
    flows: flows.map(({ lineIndex, cells, ...flow }) => flow),
    nextFlow: nextFlow ? Object.fromEntries(Object.entries(nextFlow).filter(([key]) => !['lineIndex', 'cells'].includes(key))) : null,
    allDone: flows.length > 0 && flows.every((flow) => flow.status === '已深挖'),
    issues,
  };
}

export async function markCandidateFlowDone({ kbRoot, repo, flowName }) {
  if (!repo) throw new Error('repo is required');
  if (!flowName) throw new Error('flowName is required');

  const relativePath = candidatePath(repo);
  const fullPath = path.join(kbRoot, relativePath);
  const markdown = await readFile(fullPath, 'utf8');
  const lines = markdown.split('\n');
  const flows = parseCandidateFlowTable(markdown);
  const flow = flows.find((candidate) => candidate.name === flowName);
  if (!flow) {
    return { kbRoot, repo, path: relativePath, updated: false, reason: 'not-found' };
  }

  flow.cells[11] = '已深挖';
  lines[flow.lineIndex] = `| ${flow.cells.join(' | ')} |`;
  await writeFile(fullPath, lines.join('\n'), 'utf8');
  return { kbRoot, repo, path: relativePath, updated: true, flow: flowName };
}
