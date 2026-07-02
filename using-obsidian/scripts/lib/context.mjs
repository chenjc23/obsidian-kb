import path from 'node:path';
import { resolveKbRoot } from './kb-root.mjs';

export function today() {
  return new Date().toISOString().slice(0, 10);
}

export function parseArgs(args = []) {
  const parsed = { positional: [], json: false, kbRoot: undefined, flags: {} };
  for (let index = 0; index < args.length; index += 1) {
    const value = args[index];
    if (value === '--json') {
      parsed.json = true;
    } else if (value === '--kb-root') {
      parsed.kbRoot = args[index + 1];
      index += 1;
    } else if (value === '--') {
      throw new Error('Unexpected argument separator "--"; pass flags directly, e.g. --repo <repo> --topic <topic>');
    } else if (value.startsWith('--')) {
      const key = value.slice(2);
      const next = args[index + 1];
      if (next === undefined || next.startsWith('--')) {
        parsed.flags[key] = true;
      } else {
        parsed.flags[key] = next;
        index += 1;
      }
    } else {
      parsed.positional.push(value);
    }
  }
  return parsed;
}

export function resolveContext({ cwd = process.cwd(), args = [] } = {}) {
  const parsed = parseArgs(args);
  const resolved = resolveKbRoot({ cwd, explicit: parsed.kbRoot });
  return {
    workspaceRoot: cwd,
    kbRoot: resolved.kbRoot,
    kbRootFlag: parsed.kbRoot,
    json: parsed.json,
    positional: parsed.positional,
    flags: parsed.flags,
  };
}
