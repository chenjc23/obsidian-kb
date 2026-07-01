import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseYaml } from './yaml.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const AUTHORING = path.resolve(HERE, '../../../obsidian-kb-authoring');
const VALID_VIEWS = new Set(['usecase', 'logical', 'development', 'runtime', 'contract', 'meta']);

export function registryPath() { return path.join(AUTHORING, 'registry.yaml'); }
export function templatesDir() { return path.join(AUTHORING, 'templates'); }
export function authoringDir() { return AUTHORING; }

let cached = null;

export function loadRegistry({ force = false, file } = {}) {
  if (cached && !force) return cached;
  const reg = parseYaml(readFileSync(file || registryPath(), 'utf8'));
  validate(reg, file);
  cached = reg;
  return reg;
}

function templatesDirFor(file) {
  return file ? path.join(path.dirname(file), 'templates') : templatesDir();
}

function validate(reg, file) {
  if (!reg || typeof reg !== 'object') throw new Error('registry: root must be a mapping');
  const { schema, types } = reg;
  if (!schema) throw new Error('registry: missing schema');
  for (const k of ['requiredFrontmatter', 'confidence', 'status', 'initDirs']) {
    if (!Array.isArray(schema[k])) throw new Error(`registry: schema.${k} must be a list`);
  }
  if (!types || typeof types !== 'object') throw new Error('registry: missing types');
  const tdir = templatesDirFor(file);
  for (const [type, def] of Object.entries(types)) {
    if (!def || typeof def !== 'object') throw new Error(`registry: type ${type} must be a mapping`);
    if (!VALID_VIEWS.has(def.view)) throw new Error(`registry: type ${type} invalid view: ${def.view}`);
    if (def.template != null && !existsSync(path.join(tdir, `${def.template}.template.md`))) {
      throw new Error(`registry: type ${type} template not found: ${def.template}`);
    }
    if (def.members != null) {
      if (typeof def.members !== 'object' || Array.isArray(def.members)) {
        throw new Error(`registry: ${type} members must be a mapping`);
      }
      for (const [name, m] of Object.entries(def.members)) {
        if (!m || !m.template || !m.target) {
          throw new Error(`registry: ${type} member ${name} needs template and target`);
        }
        if (!existsSync(path.join(tdir, `${m.template}.template.md`))) {
          throw new Error(`registry: ${type} member template not found: ${m.template}`);
        }
      }
    }
  }
}

function types() { return loadRegistry().types; }
// 一个 scaffold 标识产出的页面 type：pageType 显式声明（别名用），否则即键名本身。
const canon = (key, def) => def.pageType ?? key;

export function allTypes() { return Object.keys(types()); }
export function validTypes() {
  const t = types();
  return new Set(Object.keys(t).map((k) => canon(k, t[k])));
}
export function canonicalTypes() {
  const t = types();
  return Object.keys(t).filter((k) => canon(k, t[k]) === k);
}
export function scaffoldableTypes() {
  const t = types();
  return Object.keys(t).filter((k) => t[k].template != null || t[k].members != null).sort();
}
export function memberNames(type) {
  const def = types()[type];
  return def?.members ? Object.keys(def.members) : [];
}
export function requiredFrontmatter() { return loadRegistry().schema.requiredFrontmatter; }
export function validConfidence() { return loadRegistry().schema.confidence; }
export function validStatus() { return loadRegistry().schema.status; }
export function initDirs() { return loadRegistry().schema.initDirs; }
