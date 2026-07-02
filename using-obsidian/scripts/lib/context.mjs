import path from 'node:path';

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
  const kbRoot = parsed.kbRoot ? path.resolve(cwd, parsed.kbRoot) : path.join(cwd, 'code-kb');
  return {
    workspaceRoot: cwd,
    kbRoot,
    kbRootFlag: parsed.kbRoot,
    json: parsed.json,
    positional: parsed.positional,
    flags: parsed.flags,
  };
}
