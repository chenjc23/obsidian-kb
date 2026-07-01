import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { authoringDir, loadRegistry } from './registry.mjs';

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

export function fillPlaceholders(str, { repo = '', topic = '' } = {}) {
  return str.replaceAll('{repo}', repo).replaceAll('{topic}', topic);
}

function statePath(kbRoot) {
  return path.join(kbRoot, '.obsidian-kb', 'pipeline-state.json');
}

export async function readState(kbRoot) {
  try {
    return JSON.parse(await readFile(statePath(kbRoot), 'utf8'));
  } catch {
    return {};
  }
}

export async function markStageDone(kbRoot, pipelineName, stageId) {
  const state = await readState(kbRoot);
  if (!state[pipelineName]) state[pipelineName] = {};
  state[pipelineName][stageId] = true;
  const p = statePath(kbRoot);
  await mkdir(path.dirname(p), { recursive: true });
  await writeFile(p, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
}

// produces 项以 / 结尾 = 目录(存在且非空);否则文件存在。
function producesExist(stage, ctx) {
  const items = stage.produces || [];
  for (const raw of items) {
    const rel = fillPlaceholders(raw, ctx);
    const full = path.join(ctx.kbRoot, rel);
    if (rel.endsWith('/')) {
      if (!existsSync(full)) return false;
      const kids = readdirSafe(full);
      if (kids.length === 0) return false;
    } else if (!existsSync(full)) {
      return false;
    }
  }
  return true;
}

function readdirSafe(dir) {
  try { return readdirSync(dir); } catch { return []; }
}

function noPlaceholderInProduces(stage, ctx) {
  for (const raw of stage.produces || []) {
    const rel = fillPlaceholders(raw, ctx);
    if (rel.endsWith('/')) continue; // 目录不逐文件扫,交给内部页各自 stage
    const full = path.join(ctx.kbRoot, rel);
    if (!existsSync(full)) return false;
    if (/<!--\s*填/.test(readFileSync(full, 'utf8'))) return false;
  }
  return true;
}

export async function stageDone(stage, ctx) {
  const done = stage.done || {};
  if (done.instructionSelfReport) {
    return ctx.state?.[ctx.pipelineName]?.[stage.id] === true;
  }
  if (done.tracksAllComplete) {
    const rel = fillPlaceholders(stage.tracks, ctx);
    const full = path.join(ctx.kbRoot, rel);
    if (!existsSync(full)) return false;
    return tracksAllComplete(await readFile(full, 'utf8'), done.tracksAllComplete);
  }
  // 默认档:exists(+ 可选 noPlaceholder)。无 produces 声明时回退 self-report。
  if (!stage.produces || stage.produces.length === 0) {
    return ctx.state?.[ctx.pipelineName]?.[stage.id] === true;
  }
  if (!producesExist(stage, ctx)) return false;
  if (done.noPlaceholder && !noPlaceholderInProduces(stage, ctx)) return false;
  return true;
}

export async function pipelineStatus(pipeline, ctx) {
  const state = await readState(ctx.kbRoot);
  const full = { ...ctx, state };
  const doneMap = new Map();
  const out = [];
  for (const stage of pipeline.stages) {
    // eslint-disable-next-line no-await-in-loop
    const isDone = await stageDone(stage, full);
    doneMap.set(stage.id, isDone);
    let state2;
    if (isDone) state2 = 'done';
    else if ((stage.requires || []).every((r) => doneMap.get(r))) state2 = 'ready';
    else state2 = 'blocked';
    out.push({ id: stage.id, state: state2 });
  }
  return out;
}

export async function pipelineNext(pipeline, ctx) {
  const status = await pipelineStatus(pipeline, ctx);
  const ready = status.find((s) => s.state === 'ready');
  if (!ready) {
    const anyBlocked = status.some((s) => s.state === 'blocked');
    return anyBlocked ? { blocked: true, status } : { done: true };
  }
  const stage = pipeline.stages.find((s) => s.id === ready.id);
  let instruction = '';
  if (stage.instruction) {
    const p = path.join(authoringDir(), stage.instruction);
    instruction = existsSync(p) ? readFileSync(p, 'utf8') : `(instruction 文件缺失: ${stage.instruction})`;
  }
  return { id: stage.id, instruction, produces: stage.produces || [] };
}

export function getPipeline(name) {
  const reg = loadRegistry();
  const pipelines = reg.pipelines || {};
  if (!pipelines[name]) throw new Error(`未知 pipeline: ${name}(可选 ${Object.keys(pipelines).join('|') || '无'})`);
  return pipelines[name];
}
