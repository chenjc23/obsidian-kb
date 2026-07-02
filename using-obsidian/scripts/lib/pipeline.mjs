import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
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
  return path.join(kbRoot, '.obsidian', 'pipeline-state.json');
}

function stateScope({ pipelineName = '', repo = '', topic = '', pipeline } = {}) {
  const pipelineShape = (pipeline?.stages || []).map((stage) => ({
    id: stage.id,
    requires: stage.requires || [],
    produces: stage.produces || [],
    tracks: stage.tracks || '',
    done: stage.done || {},
  }));
  const fingerprint = createHash('sha256')
    .update(JSON.stringify(pipelineShape))
    .digest('hex')
    .slice(0, 16);
  return {
    key: [pipelineName, repo, topic || '', fingerprint].join('\u001f'),
    pipelineName,
    repo,
    topic: topic || '',
    fingerprint,
  };
}

async function readRawState(kbRoot) {
  try {
    return JSON.parse(await readFile(statePath(kbRoot), 'utf8'));
  } catch {
    return {};
  }
}

export async function readState(kbRoot, scopeInput) {
  const state = await readRawState(kbRoot);
  if (!scopeInput) return state;
  const scope = stateScope(scopeInput);
  const entry = state.version === 1 ? state.scopes?.[scope.key] : undefined;
  if (!entry) return { [scope.pipelineName]: {} };
  if (
    entry.pipelineName !== scope.pipelineName
    || entry.repo !== scope.repo
    || entry.topic !== scope.topic
    || entry.fingerprint !== scope.fingerprint
  ) {
    return { [scope.pipelineName]: {} };
  }
  return { [scope.pipelineName]: entry.stages || {} };
}

export async function markStageDone(kbRoot, pipelineName, stageId, scopeInput = {}) {
  const state = await readRawState(kbRoot);
  const next = state.version === 1 ? state : { version: 1, scopes: {} };
  if (!next.scopes) next.scopes = {};
  const scope = stateScope({ ...scopeInput, pipelineName });
  if (!next.scopes[scope.key]) {
    next.scopes[scope.key] = {
      pipelineName,
      repo: scope.repo,
      topic: scope.topic,
      fingerprint: scope.fingerprint,
      stages: {},
    };
  }
  next.scopes[scope.key].stages[stageId] = true;
  const p = statePath(kbRoot);
  await mkdir(path.dirname(p), { recursive: true });
  await writeFile(p, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
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

export async function stageDone(stage, ctx) {
  const done = stage.done || {};
  if (done.instructionSelfReport) {
    if (ctx.state?.[ctx.pipelineName]?.[stage.id] !== true) return false;
  }
  if (done.tracksAllComplete) {
    const rel = fillPlaceholders(stage.tracks, ctx);
    const full = path.join(ctx.kbRoot, rel);
    if (!existsSync(full)) return false;
    if (!tracksAllComplete(await readFile(full, 'utf8'), done.tracksAllComplete)) return false;
  }
  if (done.exists === 'produces') {
    if (!producesExist(stage, ctx)) return false;
  }
  // 无 produces 声明且无显式 done 条件时回退 self-report。
  if (!stage.produces || stage.produces.length === 0) {
    if (Object.keys(done).length === 0) return ctx.state?.[ctx.pipelineName]?.[stage.id] === true;
    return true;
  }
  // 默认档:有 produces 但未声明 done.exists 时仍按产物存在判定。
  if (done.exists == null && !producesExist(stage, ctx)) return false;
  return true;
}

export async function pipelineStatus(pipeline, ctx) {
  const state = await readState(ctx.kbRoot, { ...ctx, pipeline });
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
  const instructions = Array.isArray(stage.instructions) ? stage.instructions : [];
  const instruction = instructions.map((instructionPath) => {
    const p = path.join(authoringDir(), instructionPath);
    return existsSync(p) ? readFileSync(p, 'utf8') : `(instruction 文件缺失: ${instructionPath})`;
  }).join('\n\n');
  return { id: stage.id, instruction, produces: stage.produces || [] };
}

export function getPipeline(name) {
  const reg = loadRegistry();
  const pipelines = reg.pipelines || {};
  if (!pipelines[name]) throw new Error(`未知 pipeline: ${name}(可选 ${Object.keys(pipelines).join('|') || '无'})`);
  return pipelines[name];
}
