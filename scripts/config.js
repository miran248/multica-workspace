/** Shared catalog resolution and offline validation for every workspace consumer.
 *  The catalog is anonymous: workspace identity, owners and runtimes are resolved from the
 *  live platform at sync time and never stored in this repository. */
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, realpathSync, statSync } from 'node:fs';
import { dirname, join, isAbsolute, relative, resolve as resolvePath } from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { fileURLToPath } from 'node:url';
import { entrypoint } from './cli.js';
import { loadLedger, validateLedger } from './migrations.js';

export const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
export function validateTimezone(timezone) {
  if (/^[+-]/.test(timezone)) throw new Error('Invalid timezone');
  new Intl.DateTimeFormat('en', { timeZone: timezone });
}
export const readJSON = path => parseJSON(readFileSync(path, 'utf8'));
export function loadTemplate(name = 'default', root = ROOT) {
  if (name !== 'default') throw new Error('Only the shared default catalog is deployable');
  const catalog = parseJSON(readAsset('templates/default.json', root));
  validateSchema(catalog, 'catalog', root);
  return catalog;
}

export const ROLES = ['general', 'planner', 'implementer', 'reviewer', 'release'];
export const AUTOPILOTS = ['config-sync'];
export const WORKFLOWS = ['factory'];
export const DOCUMENTS = ['templates/handoff.md'];
const keyPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ajv = new Ajv2020({ coerceTypes: false, useDefaults: false, removeAdditional: false });
addFormats(ajv);
ajv.addFormat('uuid', /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i);
const validators = new Map();
function validateSchema(value, name, root) {
  const key = `${root}/${name}`;
  if (!validators.has(key)) validators.set(key, ajv.compile(parseJSON(readAsset(`schemas/${name}.schema.json`, root))));
  const validate = validators.get(key);
  if (!validate(value)) {
    const error = validate.errors[0];
    throw new Error(`Invalid ${name} ${error.instancePath}/${error.params.additionalProperty ?? error.params.missingProperty ?? ''}: ${error.message}`);
  }
}
export const sha256 = value => createHash('sha256').update(value).digest('hex');
/** JSON.parse validates grammar; a token walk additionally rejects duplicate object keys. */
export function parseJSON(text) {
  const value = JSON.parse(text);
  const tokens = text.match(/"(?:\\[\s\S]|[^"\\])*"|[{}\[\]:,]|true|false|null|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/g);
  let index = 0;
  function walk() {
    const token = tokens[index++];
    if (token === '{') {
      const keys = new Set();
      while (tokens[index] !== '}') {
        const key = JSON.parse(tokens[index++]);
        if (keys.has(key)) throw new Error(`Duplicate JSON key: ${key}`);
        keys.add(key);
        index++; // colon
        walk();
        if (tokens[index] !== ',') break;
        index++;
      }
      index++;
    } else if (token === '[') {
      while (tokens[index] !== ']') {
        walk();
        if (tokens[index] !== ',') break;
        index++;
      }
      index++;
    }
  }
  walk();
  return value;
}
export function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value !== null && typeof value === 'object') return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}`;
  return JSON.stringify(value);
}

export function validateModelFamily({ model, thinking_level: effort }) {
  const efforts = ['', 'off', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max', 'ultra'];
  if (typeof model !== 'string' || !model || !efforts.includes(effort)) throw new Error('Invalid model/effort');
  const deepseek = /deepseek/i.test(model), astra = /astra/i.test(model);
  if ((deepseek || astra) && !['off', 'minimal', 'low', 'medium', 'high'].includes(effort)) throw new Error('Model family effort cap requires explicit effort at most high');
  if (deepseek && model !== 'deepseek-official/deepseek-flash') throw new Error('DeepSeek family requires Flash');
}

function sameKeys(actual, expected, label) {
  if (canonical([...actual].sort()) !== canonical([...expected].sort())) throw new Error(`${label}: unknown or missing logical key`);
}
function knownKeys(actual, expected, label) {
  for (const key of actual) if (!expected.includes(key)) throw new Error(`${label}: unknown key ${key}`);
}

/** Resolve a repository asset after lexical AND realpath checks, including symlinks. */
export function readAsset(path, root = ROOT) {
  if (typeof path !== 'string' || isAbsolute(path) || path.includes('\\') || path.split('/').some(s => s === '..' || s === '.' || s === '')) throw new Error(`Unsafe repository path: ${path}`);
  const base = realpathSync(root), absolute = realpathSync(resolvePath(base, path));
  const rel = relative(base, absolute);
  if (isAbsolute(rel) || rel === '..' || rel.startsWith('../') || !statSync(absolute).isFile()) throw new Error(`Unsafe repository path: ${path}`);
  return readFileSync(absolute, 'utf8');
}

function substitute(text, values, allowed, { date = false } = {}) {
  const used = new Set();
  const result = text.replace(/\{\{([^{}]+)\}\}/g, (_, key) => {
    if (key === 'date' && date) return '{{date}}';
    if (!allowed.includes(key) || typeof values[key] !== 'string') throw new Error(`Unresolved or unapproved parameter: ${key}`);
    used.add(key);
    return values[key];
  });
  const remaining = date ? result.replaceAll('{{date}}', '') : result;
  if (remaining.includes('{{') || remaining.includes('}}')) throw new Error('Malformed template parameter');
  return { content: result, used };
}

/** Every supporting file of a skill, in stable order. */
function skillFiles(root, logicalId) {
  const directory = join(root, 'skills', logicalId);
  return readdirSync(directory, { recursive: true, withFileTypes: true })
    .filter(entry => entry.isFile())
    .map(entry => relative(directory, join(entry.parentPath ?? entry.path, entry.name)).replaceAll('\\', '/'))
    .filter(path => path !== 'SKILL.md')
    .filter(path => {
      if (path.split('/').some(part => part.startsWith('.'))) throw new Error(`Skill ${logicalId}: hidden file ${path} is not deployable`);
      return true;
    })
    .sort();
}

/** Git is the pin: the directory is the file set, and every file is read into the asset map
 *  so the shared hash and the readback cover the exact bytes this run will import. */
function loadSkillAssets(manifest, asset, root) {
  const entries = manifest.skills;
  const ids = entries.map(entry => entry.logical_id);
  const directories = readdirSync(join(root, 'skills'), { withFileTypes: true })
    .filter(entry => entry.isDirectory()).map(entry => entry.name).sort();
  sameKeys(directories, [...ids].sort(), 'skills');
  for (const id of ids) {
    if (!keyPattern.test(id)) throw new Error(`Unknown logical skill key: ${id}`);
    asset(`skills/${id}/SKILL.md`);
    for (const path of skillFiles(root, id)) asset(`skills/${id}/${path}`);
  }
}

/** Provenance is an auditable record, not an enforced byte identity: a fork or rewrite is
 *  expected to differ from upstream, and no local file is refreshed from the pin. */
function validateSkillManifest(manifest) {
  const block = manifest.provenance;
  if (!block || block.repo !== 'mattpocock/skills' || !/^[a-f0-9]{40}$/.test(block.commit ?? ''))
    throw new Error('Skill provenance: missing mattpocock/skills pin');
  if (block.license !== 'MIT' || block.notice !== 'NOTICE') throw new Error('Skill provenance: missing MIT attribution');
  const statuses = new Set(['identical', 'fork', 'rewrite', 'own']);
  const upstreamNames = new Set();
  const ids = new Set();
  for (const skill of manifest.skills) {
    if (typeof skill.logical_id !== 'string' || ids.has(skill.logical_id)) throw new Error('Skill manifest: duplicate or empty logical_id');
    ids.add(skill.logical_id);
    const provenance = skill.provenance;
    if (!provenance || !statuses.has(provenance.status)) throw new Error(`Skill provenance: missing status for ${skill.logical_id}`);
    if (provenance.status === 'own') {
      if (provenance.upstream) throw new Error(`Skill provenance: own skill carries an upstream: ${skill.logical_id}`);
      continue;
    }
    if (typeof provenance.upstream !== 'string' || !provenance.upstream) throw new Error(`Skill provenance: missing upstream name for ${skill.logical_id}`);
    if (upstreamNames.has(provenance.upstream)) throw new Error(`Skill provenance: duplicate upstream name ${provenance.upstream}`);
    upstreamNames.add(provenance.upstream);
  }
}

/** The exact bytes of one skill, for planning and for import/update. */
export function skillAsset(assets, logicalId) {
  const prefix = `skills/${logicalId}/`;
  const main = assets[`${prefix}SKILL.md`];
  if (typeof main?.content !== 'string') throw new Error(`Skill content missing: ${logicalId}`);
  const files = Object.entries(assets)
    .filter(([path]) => path.startsWith(prefix) && path !== `${prefix}SKILL.md`)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([path, entry]) => ({ path: path.slice(prefix.length), content: entry.content, sha256: entry.sha256 }));
  return { content: main.content, sha256: main.sha256, files };
}

/** Resolve the catalog for one live workspace binding. The binding is never written to Git. */
export function resolve(binding, root = ROOT) {
  const scope = binding?.identity?.workspace_slug ?? 'unknown workspace';
  try {
    return resolveChecked(loadTemplate('default', root), binding, root);
  } catch (error) {
    throw new Error(`Workspace ${scope}: ${error.message}`, { cause: error });
  }
}

function resolveChecked(catalog, binding, root) {
  validateSchema(binding, 'binding', root);
  validateModelFamily(catalog.defaults);
  if (catalog.defaults.model !== 'deepseek-official/deepseek-flash' || catalog.defaults.thinking_level !== 'high' || catalog.defaults.required_provider !== 'dsh') throw new Error('flash-first-v1 requires Flash/high/Dsh defaults; no fallback');
  sameKeys(Object.keys(catalog.agents), ROLES, 'agents');
  sameKeys(Object.keys(catalog.autopilots), AUTOPILOTS, 'catalog autopilots');
  sameKeys(Object.keys(catalog.workflows), WORKFLOWS, 'catalog workflows');
  const documents = Object.fromEntries(DOCUMENTS.map(path => [path.split('/').at(-1).split('.')[0], path]));
  if (canonical(catalog.documents) !== canonical(documents)) throw new Error('Catalog documents: missing or noncanonical logical key/path');
  if (catalog.shared_instructions !== 'shared/instructions.md' || catalog.skill_manifest !== 'skills/manifest.json') throw new Error('Canonical shared instructions/skill manifest required');
  validateTimezone(catalog.timezone);
  const timezone = catalog.timezone;
  const assets = {};
  const asset = path => {
    if (Object.hasOwn(assets, path)) return assets[path].content;
    const content = readAsset(path, root);
    assets[path] = { content, sha256: sha256(content) };
    return content;
  };
  // The catalog commits no origin: the shared contract addresses the handoff template through
  // {{repository}}, resolved from the workspace's git origin when the contract is rendered.
  const instructions = substitute(asset(catalog.shared_instructions), { repository: binding.repository }, ['repository']).content;
  const rolePrompts = Object.fromEntries(ROLES.map(role => [role, asset(`roles/${role}.md`)]));
  const skillManifest = parseJSON(asset(catalog.skill_manifest));
  validateSchema(skillManifest, 'skills', root);
  validateSkillManifest(skillManifest);
  loadSkillAssets(skillManifest, asset, root);
  const skillIds = skillManifest.skills.map(entry => entry.logical_id);

  const names = Object.values(catalog.squads).map(s => s.name);
  if (new Set(names).size !== names.length) throw new Error('Duplicate squad name');
  const squads = Object.fromEntries(Object.entries(catalog.squads).map(([key, squad]) => {
    if (!squad.members.includes(squad.leader)) throw new Error(`Squad ${key}: leader missing from roster`);
    knownKeys(squad.members, ROLES, `Squad ${key}`);
    return [key, { ...structuredClone(squad), instructions: asset(squad.instructions) }];
  }));
  for (const path of Object.values(catalog.documents)) asset(path);

  // Binding is declared once: each skill attaches to exactly one role, so a role/manifest
  // mismatch cannot exist by construction.
  const bound = ROLES.flatMap(role => catalog.agents[role].skills.map(id => [id, role]));
  const boundIds = bound.map(([id]) => id);
  if (new Set(boundIds).size !== boundIds.length) throw new Error('Skill bound to more than one role');
  sameKeys(boundIds, skillIds, 'Skill bindings');
  const roleOfSkill = Object.fromEntries(bound);

  const labels = Object.fromEntries(Object.entries(catalog.labels).map(([key, label]) => [key, structuredClone(label)]));
  const labelNames = Object.values(labels).map(label => label.name);
  if (new Set(labelNames).size !== labelNames.length) throw new Error('Duplicate label name');
  // The triage skill defers the canonical-role-to-label mapping to the workspace contract.
  // Rendering it from the catalog keeps that mapping and the live label set in one place.
  const triageLabels = `Triage labels (canonical role → workspace issue label): ${Object.entries(labels)
    .filter(([, label]) => label.triage !== false)
    .sort(([a], [b]) => a.localeCompare(b)).map(([key, label]) => `${key}→${label.name}`).join(', ')}. Every triaged issue carries exactly one category and one state label.`;

  const definitions = Object.fromEntries(Object.entries(catalog.autopilots).map(([key, path]) => {
    const definition = parseJSON(asset(path));
    validateSchema(definition, 'autopilot', root);
    if (definition.key !== key || !ROLES.includes(definition.role)) throw new Error(`Unknown workflow key/role: ${key}`);
    const prompt = asset(definition.prompt);
    // Check ALL catalog templates, including ones with no selected local instance.
    const probes = Object.fromEntries(definition.parameters.map(p => [p, `typed-${p.replaceAll('.', '-')}`]));
    const used = new Set();
    const probeset = [[definition.title, false], [prompt, false], ...(definition.issue_title_template ? [[definition.issue_title_template, true]] : [])];
    for (const [text, date] of probeset) {
      for (const p of substitute(text, probes, definition.parameters, { date }).used) used.add(p);
    }
    sameKeys([...used], definition.parameters, `Workflow parameters ${key}`);
    return [key, { ...definition, prompt }];
  }));
  if (!definitions['config-sync']) throw new Error('Missing config-sync autopilot');
  const projectWorkflows = Object.fromEntries(Object.entries(catalog.workflows).map(([key, path]) => {
    const definition = parseJSON(asset(path));
    validateSchema(definition, 'project-workflow', root);
    if (definition.key !== key) throw new Error(`Unknown project workflow key: ${key}`);
    const seen = new Set();
    const statusKey = step => {
      if (!step.new_status) return step.status_key;
      const derived = step.new_status.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');
      if (step.status_key && step.status_key !== derived) throw new Error(`Project workflow ${key}: new status key must be ${derived}`);
      return derived;
    };
    const steps = definition.steps.map(step => {
      const status_key = statusKey(step);
      if (!status_key || seen.has(status_key)) throw new Error(`Project workflow ${key}: duplicate or empty status ${status_key}`);
      seen.add(status_key);
      const handler = { ...(step.handler ?? { type: 'none' }) };
      if (handler.type === 'agent' && !ROLES.includes(handler.role)) throw new Error(`Project workflow ${key}: unknown handler role ${handler.role}`);
      if (handler.type === 'member' && handler.role !== 'human') throw new Error(`Project workflow ${key}: unknown member handler ${handler.role}`);
      if (!['none', 'project_lead', 'creator', 'agent', 'member'].includes(handler.type)) throw new Error(`Project workflow ${key}: unknown handler type ${handler.type}`);
      for (const target of [step.next_status_key, step.back_status_key]) {
        if (target && !definition.steps.some(item => statusKey(item) === target)) throw new Error(`Project workflow ${key}: unknown target status ${target}`);
      }
      return { status_key, handler, instructions: step.instructions ?? '',
        next_status_key: step.next_status_key ?? null, back_status_key: step.back_status_key ?? null,
        ...(step.new_status ? { new_status: step.new_status } : {}) };
    });
    if (!steps.some(step => step.handler.type !== 'none')) throw new Error(`Project workflow ${key}: no handoff step`);
    return [key, { key, name: definition.name, description: definition.description, steps }];
  }));
  sameKeys(Object.keys(binding.agent_runtimes), ROLES, 'agent_runtimes');
  const values = { ...binding.identity, workspace_id: binding.workspace_id, human_user_id: binding.human_user_id, timezone, repository: binding.repository };
  const workflow = (definition, sync = false) => {
    if (!definition || (definition.key === 'config-sync') !== sync) throw new Error(`Unknown workflow template: ${definition?.key ?? 'missing'}`);
    const render = (text, date = false) => substitute(text, values, definition.parameters, { date }).content;
    const prompt = render(definition.prompt);
    return { key: definition.key, title: render(definition.title), role: definition.role, cron: definition.cron, timezone,
      execution_mode: definition.execution_mode,
      issue_title_template: definition.execution_mode === 'create_issue' ? render(definition.issue_title_template, true) : null,
      prompt, deployment_prompt: prompt };
  };
  const sourceLine = [`Configuration source: ${binding.repository}.`];
  const owners = binding.owner_ids;
  const approvalLine = owners.length === 1
    ? `Workspace approval owner (user ID): ${owners[0]}.`
    : `Workspace approval owners (user IDs): ${owners.join(', ')}; the first receives autopilot reports.`;
  const agents = Object.fromEntries(ROLES.map(role => {
    const agent = {
      ...catalog.defaults, ...structuredClone(catalog.agents[role]),
      instructions: [instructions.trim(), rolePrompts[role].trim(), triageLabels, approvalLine,
        'Use the assigned project for repository selection.', ...sourceLine,
      ].join('\n\n') + '\n',
    };
    // The role entry overrides the defaults; the family cap applies to the merged pair.
    validateModelFamily(agent);
    return [role, agent];
  }));
  const blocked = [];
  for (const role of ROLES) if (!binding.agent_runtimes?.[role]) blocked.push(`agent_runtimes.${role}: pending`);
  if (!owners.length) blocked.push('owner: no approval owner resolved');
  const autopilots = [];
  const sync = workflow(definitions['config-sync'], true);
  // The ledger is the only place a rename or an explicit retirement is declared. It is
  // validated against this workspace's resolved names, so a stale or ambiguous event fails
  // the offline check before any live read or write.
  const migrations = validateLedger(loadLedger(root), {
    validate: event => validateSchema(event, 'migration', root),
    declared: { agent: new Set(ROLES), label: new Set(labelNames), skill: new Set(skillIds),
      squad: new Set(Object.values(squads).map(squad => squad.name)),
      workflow: new Set(Object.values(projectWorkflows).map(item => item.name)),
      autopilot: new Set([...autopilots.map(item => item.title), sync.title]) },
    scope: binding.identity.workspace_slug,
  });
  const shared = { catalog: structuredClone(catalog), autopilots: definitions, workflows: projectWorkflows, assets };
  return { shared, shared_hash: sha256(canonical(shared)), binding_hash: sha256(canonical(binding)),
    ledger_hash: sha256(canonical(migrations)), migrations,
    agents, squads, autopilots, project_workflows: projectWorkflows, sync, role_skills: roleOfSkill,
    bindings: structuredClone(binding), deployment: { status: blocked.length ? 'blocked' : 'configured', reasons: blocked,
      verification: 'offline only; no live readback', sync_inventory: 'unverified' } };
}

/** Offline validation needs a binding shape, not a workspace: these placeholders never reach
 *  the platform, and the anonymity test pins the all-zero prefix as the only allowed UUID. */
export function syntheticBinding() {
  const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
  return { workspace_id: id(1), human_user_id: id(2), owner_ids: [id(2)],
    identity: { workspace_name: 'Validation', workspace_slug: 'validation', human_name: 'Owner' },
    agent_runtimes: Object.fromEntries(ROLES.map(role => [role, id(3)])), repository: 'https://github.com/OWNER/multica-workspace' };
}

export function main() {
  const output = resolve(syntheticBinding());
  console.log(`Valid catalog: default; ${output.deployment.status}; sync ${output.deployment.sync_inventory}; shared ${output.shared_hash}`);
  for (const reason of output.deployment.reasons) console.log(`  ${reason}`);
  if (output.deployment.status !== 'configured') process.exitCode = 1;
}
entrypoint(import.meta.url, main);
