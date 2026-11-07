/** Name-keyed reconciliation. The catalog declares names; the sync compares and writes by name.
 *  No live ID is stored in Git: renames are declared in the migration ledger, and absence from
 *  the catalog is retired with an explicit guard. */
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { resolve, ROOT, canonical, sha256, skillAsset } from './config.js';

import { unpack } from './platform.js';
export { unpack };
export const digest = value => sha256(canonical(value));
const same = (a, b) => canonical(a) === canonical(b);
const subscribers = record => (record?.subscribers ?? []).map(s => ({ user_id: s.user_id, user_type: s.user_type })).sort((a, b) => canonical(a).localeCompare(canonical(b)));
const pick = (record, keys) => Object.fromEntries(keys.map(k => [k, k === 'subscribers' ? subscribers(record) : record?.[k] ?? null]));
const flags = object => Object.entries(object).flatMap(([k, v]) => [`--${k.replaceAll('_', '-')}`, String(v)]);
const skills = value => (value ?? []).map(s => typeof s === 'string' ? s : s.id).sort();
const fileDigest = value => (value ?? []).map(file => ({ path: file.path, sha256: file.sha256 ?? sha256(file.content ?? '') })).sort((a, b) => a.path.localeCompare(b.path));
const skillIdentity = asset => ({ sha256: asset.sha256, files: fileDigest(asset.files) });
const memberRecord = member => ({ member_id: member.member_id, member_type: member.member_type, role: member.role ?? null });
const tuple = ['model', 'thinking_level', 'runtime_id'];
const agentFields = ['name', 'description', 'max_concurrent_tasks', 'instructions', ...tuple];
const labelFields = ['name', 'color', 'description', 'resource_type'];
const pilotFields = ['title', 'description', 'execution_mode', 'issue_title_template', 'subscribers'];
const CLOSED = new Set(['done', 'cancelled']);
const GROUPS = { agent: 'agents', label: 'labels', skill: 'skills', squad: 'squads', workflow: 'workflows', autopilot: 'autopilots' };
const group = entity => GROUPS[entity] ?? 'autopilots';
const nameField = entity => entity === 'autopilot' || entity === 'sync' ? 'title' : 'name';
const nameOf = (entity, record) => record?.[nameField(entity)] ?? null;
const isLiveAgent = record => record && !record.archived_at;

export function discover(call) {
  return {
    agents: unpack(call('agent', 'list', '--include-archived'), 'agents'),
    squads: unpack(call('squad', 'list'), 'squads'),
    labels: unpack(call('label', 'list', '--resource-type', 'issue'), 'labels'),
    skills: unpack(call('skill', 'list'), 'skills'),
    workflows: unpack(call('workflow', 'list'), 'workflows'),
    autopilots: unpack(call('autopilot', 'list'), 'autopilots'),
    projects: unpack(call('project', 'list'), 'projects'),
  };
}

export const findLive = (live, entity, name) => live[group(entity)]
  .find(record => nameOf(entity, record) === name && !(entity === 'agent' && record.archived_at)) ?? null;
export const idOf = (live, entity, name) => {
  const record = findLive(live, entity, name);
  if (!record) throw new Error(`Live ${entity} not found by name: ${name}`);
  return record.id;
};
const roleOf = (live, id) => live.agents.find(agent => agent.id === id && isLiveAgent(agent))?.name ?? null;
const handlerSpec = (live, binding, handler) => handler.type === 'agent' ? { type: 'agent', role: roleOf(live, handler.id) }
  : handler.type === 'member' && handler.id === binding.human_user_id ? { type: 'member', role: 'human' }
  : handler.type === 'member' ? { type: 'member', id: handler.id } : { type: handler.type };
const workflowSteps = (live, binding, steps) => steps.map(step => ({ status_key: step.status_key,
  handler: handlerSpec(live, binding, step.handler ?? { type: 'none' }),
  instructions: step.instructions ?? '', next_status_key: step.next_status_key ?? null, back_status_key: step.back_status_key ?? null }));
const concreteSteps = (live, binding, steps) => steps.map(step => ({ ...step,
  handler: step.handler.type === 'agent' ? { type: 'agent', id: idOf(live, 'agent', step.handler.role) }
    : step.handler.type === 'member' ? { type: 'member', id: binding.human_user_id } : step.handler }));
const handlerArg = handler => ['agent', 'member'].includes(handler.type) ? handler.id : handler.type;

export function resolvedForDeployment(binding, { root = ROOT } = {}) {
  const output = resolve(binding, root);
  if (output.deployment.reasons.length) throw new Error(`Deployment blocked: ${output.deployment.reasons.join('; ')}`);
  return output;
}

/** Open issues block archiving an agent unless a ledger retire event names it. */
function openIssues(call, id) {
  const issues = [];
  for (let offset = 0; ;) {
    const page = call('issue', 'list', '--assignee-id', id, '--limit', '100', '--offset', String(offset), '--fields', 'identifier,status');
    issues.push(...(page.issues ?? []));
    if (!page.has_more) break;
    offset += page.issues.length;
  }
  return issues.filter(issue => !CLOSED.has(issue.status));
}

export function buildPlan(binding, { root = ROOT, runner, keepUnmanaged = false } = {}) {
  const resolved = resolvedForDeployment(binding, { root });
  const current = runner('', 'workspace', 'get');
  if (current.id !== binding.workspace_id) throw new Error('Workspace changed during the run; start again from the target runtime');
  const call = (...args) => runner(binding.workspace_id, ...args);
  const runtimes = unpack(call('runtime', 'list'), 'runtimes');
  for (const [role, id] of Object.entries(binding.agent_runtimes)) if (!runtimes.some(r => r.id === id && r.workspace_id === binding.workspace_id && (!r.provider || r.provider === 'dsh'))) throw new Error(`Runtime outside target workspace: ${role}`);
  const members = unpack(call('workspace', 'member', 'list'), 'members');
  if (!members.some(m => (m.user_id ?? m.id) === binding.human_user_id)) throw new Error('Approval owner is not a member of the target workspace');
  const live = discover(call);
  const operations = [], checks = [];
  function operation(entity, key, id, before, after, action = 'update') {
    if (!same(before, after)) operations.push({ entity, key, id: id ?? null, action, before, after });
    else checks.push({ entity, key, id, after });
  }
  const retired = new Set(resolved.migrations.filter(event => event.kind === 'retire').map(event => `${event.entity}:${event.name}`));

  // Declared renames run before any comparison: the live object keeps its identity, and the
  // catalog only needs to declare the end state. A rename that already happened is a no-op.
  for (const event of resolved.migrations.filter(item => item.kind === 'rename')) {
    const existing = findLive(live, event.entity, event.from);
    const target = findLive(live, event.entity, event.to);
    if (existing && target) throw new Error(`Migration ledger: both ${event.from} and ${event.to} exist as ${event.entity}`);
    if (!existing) continue;
    const field = nameField(event.entity);
    operations.push({ entity: event.entity, key: `${event.from}→${event.to}`, id: existing.id, action: 'rename',
      before: { [field]: event.from }, after: { [field]: event.to } });
    existing[field] = event.to;
  }

  const required = Object.keys(resolved.agents);
  const skillNames = JSON.parse(resolved.shared.assets['skills/manifest.json'].content).skills.map(skill => skill.logical_id);
  const labelNames = Object.values(resolved.shared.catalog.labels).map(label => label.name);
  const squadNames = Object.values(resolved.squads).map(squad => squad.name);
  const workflowNames = Object.values(resolved.shared.workflows).map(workflow => workflow.name);
  const autopilotNames = [...resolved.autopilots.map(item => item.title), resolved.sync.title];

  const duplicate = (entity, name) => {
    const matches = live[group(entity)].filter(record => nameOf(entity, record) === name && !(entity === 'agent' && record.archived_at));
    if (matches.length > 1) throw new Error(`Multiple live ${entity}s named ${name}; remove or rename the duplicates`);
    return matches[0] ?? null;
  };

  for (const [key, definition] of Object.entries(resolved.shared.catalog.labels)) {
    const record = duplicate('label', definition.name);
    if (record && (record.resource_type ?? 'issue') !== definition.resource_type)
      throw new Error(`Label resource type drift: ${key}; recreate it as ${definition.resource_type}`);
    operation('label', key, record?.id, record ? pick(record, labelFields) : null, pick(definition, labelFields), record ? 'update' : 'create');
  }

  for (const entry of JSON.parse(resolved.shared.assets['skills/manifest.json'].content).skills) {
    const asset = skillAsset(resolved.shared.assets, entry.logical_id);
    const record = duplicate('skill', entry.logical_id);
    if (!record) { operations.push({ entity: 'skill', key: entry.logical_id, id: null, action: 'create', before: null, after: skillIdentity(asset) }); continue; }
    const detail = call('skill', 'get', record.id, '--with-content');
    if (detail.id !== record.id || detail.name !== entry.logical_id) throw new Error(`Invalid skill identity: ${entry.logical_id}`);
    const identity = skillIdentity(asset);
    const liveIdentity = { sha256: sha256(detail.content ?? ''), files: fileDigest(detail.files) };
    operation('skill', entry.logical_id, record.id, liveIdentity, identity, 'update');
  }

  for (const role of required) {
    const definition = resolved.agents[role];
    const desired = pick({ ...definition, name: role, runtime_id: binding.agent_runtimes[role] }, agentFields);
    const matches = live.agents.filter(agent => agent.name === role);
    if (matches.length > 1) throw new Error(`Multiple live agents named ${role}; remove or rename the duplicates`);
    const record = matches[0] ?? null;
    if (record?.archived_at) {
      operations.push({ entity: 'agent', key: role, id: record.id, action: 'restore',
        before: { name: role, archived: true }, after: desired });
    } else operation('agent', role, record?.id, record ? pick(record, agentFields) : null, desired, record ? 'update' : 'create');
    const actual = skills(isLiveAgent(record) ? record.skills : []);
    const wanted = definition.skills.map(name => findLive(live, 'skill', name)?.id);
    if (wanted.every(Boolean) && same(actual, wanted.sort())) checks.push({ entity: 'agent-skills', key: role, id: record?.id ?? null, after: definition.skills });
    else operations.push({ entity: 'agent-skills', key: role, id: record?.id ?? null, action: 'set', before: actual, after: definition.skills });
  }

  for (const [key, squad] of Object.entries(resolved.squads)) {
    const record = duplicate('squad', squad.name);
    const desired = { name: squad.name, description: squad.description, instructions: squad.instructions, leader: squad.leader };
    const before = record ? { name: record.name, description: record.description, instructions: record.instructions,
      leader: roleOf(live, record.leader_id) } : null;
    if (record) {
      const roster = call('squad', 'member', 'list', record.id);
      const missing = squad.members.filter(role => !roster.some(member => member.member_id === idOf(live, 'agent', role)));
      for (const role of missing) operations.push({ entity: 'member', key: squad.name, id: record.id, action: 'add', before: null, after: role });
      for (const member of roster) {
        const role = roleOf(live, member.member_id);
        if (member.member_type === 'agent' && squad.members.includes(role)) continue;
        operations.push({ entity: 'member', key: squad.name, id: record.id, action: 'remove', before: memberRecord(member), after: null });
      }
    }
    operation('squad', key, record?.id, before, desired, record ? 'update' : 'create');
    if (!record) for (const role of squad.members) operations.push({ entity: 'member', key: squad.name, id: null, action: 'add', before: null, after: role });
  }

  for (const item of resolved.autopilots) {
    const record = duplicate('autopilot', item.title);
    const detail = record ? call('autopilot', 'get', record.id) : null;
    const after = { title: item.title, description: item.deployment_prompt.trim(), assignee_role: item.role,
      execution_mode: item.execution_mode,
      issue_title_template: item.issue_title_template, subscribers: [{ user_id: binding.human_user_id, user_type: 'member' }] };
    const before = detail ? { title: detail.autopilot.title, description: (detail.autopilot.description ?? '').trim(),
      assignee_role: roleOf(live, detail.autopilot.assignee_id),
      execution_mode: detail.autopilot.execution_mode, issue_title_template: detail.autopilot.issue_title_template,
      subscribers: subscribers(detail.autopilot) } : null;
    if (before && (before.execution_mode !== after.execution_mode || !same(before.subscribers, after.subscribers)))
      throw new Error('Workflow scope/mode/subscriber migration requires explicit operator reconciliation');
    operation('autopilot', item.key, record?.id, before, after, record ? 'update' : 'create');
    const schedules = (detail?.triggers ?? []).filter(trigger => trigger.kind === 'schedule');
    if (detail && (detail.triggers.length > 1 || schedules.length > 1 || schedules.some(trigger => trigger.cron_expression !== item.cron || trigger.timezone !== item.timezone || !trigger.enabled)))
      throw new Error(`Schedule drift: ${item.key}; remove the extra trigger first`);
    const schedule = { cron: item.cron, timezone: item.timezone };
    if (!schedules.length) operations.push({ entity: 'schedule', key: item.key, title: item.title, id: record?.id ?? null, action: 'add', before: [], after: schedule });
    else checks.push({ entity: 'schedule', key: item.key, title: item.title, id: record.id, after: schedule });
  }

  // The control is never created: the thing that runs syncs cannot bootstrap itself. It is
  // refreshed by title, and its status and triggers are operator state, never intent.
  const control = duplicate('autopilot', resolved.sync.title);
  if (control) {
    const detail = call('autopilot', 'get', control.id);
    const after = { title: resolved.sync.title, description: resolved.sync.deployment_prompt.trim(), assignee_role: resolved.sync.role,
      execution_mode: resolved.sync.execution_mode,
      issue_title_template: resolved.sync.issue_title_template, subscribers: subscribers(detail.autopilot) };
    const before = { title: detail.autopilot.title, description: (detail.autopilot.description ?? '').trim(),
      assignee_role: roleOf(live, detail.autopilot.assignee_id),
      execution_mode: detail.autopilot.execution_mode, issue_title_template: detail.autopilot.issue_title_template,
      subscribers: subscribers(detail.autopilot) };
    operation('sync', 'sync', control.id, before, after, 'update');
  }

  for (const [key, workflow] of Object.entries(resolved.shared.workflows)) {
    const record = duplicate('workflow', workflow.name);
    const detail = record ? call('workflow', 'get', record.id) : null;
    const after = { name: workflow.name, description: workflow.description,
      steps: workflow.steps.map(({ new_status, ...step }) => step) };
    const before = detail ? { name: detail.name, description: detail.description ?? '', steps: workflowSteps(live, binding, detail.steps) } : null;
    operation('workflow', key, record?.id, before, after, record ? 'update' : 'create');
    const planned = [...operations, ...checks].findLast(item => item.entity === 'workflow' && item.key === key);
    if (planned) planned.new_statuses = Object.fromEntries(workflow.steps.filter(step => step.new_status).map(step => [step.status_key, step.new_status]));
  }

  const projects = [...new Set(live.projects.map(project => project.id))];
  const workflowKeys = Object.keys(resolved.shared.workflows);
  if (projects.length && workflowKeys.length !== 1) throw new Error('Exactly one project workflow can be bound');
  for (const project of projects) {
    const key = workflowKeys[0], target = findLive(live, 'workflow', resolved.shared.workflows[key].name)?.id ?? null;
    const current = call('project', 'workflow', 'get', project);
    const after = { workflow: key };
    const workflowName = resolved.shared.workflows[key].name;
    if (current.workflow?.id === target) checks.push({ entity: 'project-workflow', key: project, id: project, after, workflow_name: workflowName });
    else operations.push({ entity: 'project-workflow', key: project, id: project, action: 'set', before: { workflow: current.workflow?.id ?? null }, after, workflow_name: workflowName });
  }

  if (!keepUnmanaged) {
    for (const agent of live.agents.filter(isLiveAgent).filter(agent => !required.includes(agent.name))) {
      const open = openIssues(call, agent.id);
      if (open.length && !retired.has(`agent:${agent.name}`))
        throw new Error(`Unmanaged agent ${agent.name} owns open issues: ${open.map(issue => issue.identifier).join(', ')}; reassign them or scope a retire event`);
      operations.push({ entity: 'agent', key: agent.name, id: agent.id, action: 'archive', before: { name: agent.name }, after: null });
    }
    for (const label of live.labels.filter(label => !labelNames.includes(label.name))) {
      if ((label.usage_count ?? 0) > 0 && !retired.has(`label:${label.name}`))
        throw new Error(`Unmanaged label ${label.name} is used by ${label.usage_count} issue(s); detach it or scope a retire event`);
      operations.push({ entity: 'label', key: label.name, id: label.id, action: 'delete', before: { name: label.name }, after: null });
    }
    for (const skill of live.skills.filter(skill => !skillNames.includes(skill.name)))
      operations.push({ entity: 'skill', key: skill.name, id: skill.id, action: 'delete', before: { name: skill.name }, after: null });
    for (const squad of live.squads.filter(squad => !squadNames.includes(squad.name)))
      operations.push({ entity: 'squad', key: squad.name, id: squad.id, action: 'delete', before: { name: squad.name }, after: null });
    for (const pilot of live.autopilots.filter(pilot => !autopilotNames.includes(pilot.title))) {
      // An autopilot runs unattended and its title is rendered per workspace, so it is never
      // deleted implicitly: an operator must scope the exact title in a retire event.
      if (!retired.has(`autopilot:${pilot.title}`))
        throw new Error(`Unmanaged autopilot ${pilot.title}; scope a retire event to delete it`);
      operations.push({ entity: 'autopilot', key: pilot.title, id: pilot.id, action: 'delete', before: { title: pilot.title }, after: null });
    }
    for (const workflow of live.workflows.filter(workflow => !workflowNames.includes(workflow.name))) {
      if (workflow.is_default) continue;
      if ((workflow.project_ids ?? []).length)
        throw new Error(`Unmanaged workflow ${workflow.name} is bound to a project; declare a rename event instead of recreating it`);
      operations.push({ entity: 'workflow', key: workflow.name, id: workflow.id, action: 'delete', before: { name: workflow.name }, after: null });
    }
  }

  const plan = { version: 4, workspace_id: binding.workspace_id, shared_hash: resolved.shared_hash, binding_hash: resolved.binding_hash,
    ledger_hash: resolved.ledger_hash, sync_control: control ? 'configured' : 'absent',
    operations, checks };
  return { ...plan, plan_hash: digest(plan) };
}

function updateSkill(op, id, call, assets, root) {
  const pinned = skillAsset(assets, op.key), temp = mkdtempSync(join(root, '.skill-update-'));
  try {
    const contentPath = (name, content) => { const path = join(temp, name); writeFileSync(path, content); return path; };
    const live = call('skill', 'get', id, '--with-content');
    for (const file of live.files ?? []) {
      if (pinned.files.some(entry => entry.path === file.path)) continue;
      if (!file.id) throw new Error(`Live skill file has no identity: ${op.key}/${file.path}`);
      call('skill', 'files', 'delete', id, file.id);
    }
    call('skill', 'update', id, '--content-file', contentPath('SKILL.md', pinned.content));
    for (const [index, file] of pinned.files.entries())
      call('skill', 'files', 'upsert', id, '--path', file.path, '--content-file', contentPath(`file-${index}`, file.content));
  } finally { rmSync(temp, { recursive: true, force: true }); }
}

export function executePlan(binding, plan, { root = ROOT, runner, assets = {}, pack } = {}) {
  const call = (...args) => runner(binding.workspace_id, ...args);
  const live = discover(call);
  const replacement = (entity, record) => {
    const list = live[group(entity)];
    const index = list.findIndex(item => item.id === record.id);
    if (index === -1) list.push(record); else list[index] = record;
    return record;
  };
  const refresh = (entity, id) => {
    const list = live[group(entity)];
    const index = list.findIndex(item => item.id === id);
    if (entity === 'skill') return replacement('skill', call('skill', 'get', id, '--with-content'));
    const response = call(entity === 'sync' ? 'autopilot' : entity, 'get', id);
    return replacement(entity, entity === 'autopilot' || entity === 'sync' ? response.autopilot : response);
  };
  const findRecord = (entity, op) => {
    const list = live[group(entity)];
    return (op.id && list.find(item => item.id === op.id)) || findLive(live, entity, op.key) || null;
  };
  const desired = op => op.entity === 'agent-skills'
    ? op.after.map(name => idOf(live, 'skill', name)).sort()
    : op.after;
  const readOperation = op => {
    if (op.action === 'archive' || op.action === 'delete') {
      const record = findRecord(op.entity, op);
      return record && !(op.entity === 'agent' && record.archived_at) ? { present: true } : null;
    }
    if (op.entity === 'agent-skills') {
      const record = findRecord('agent', op);
      return record ? skills(record.skills) : null;
    }
    if (op.entity === 'member') {
      const squad = findRecord('squad', op);
      if (!squad) return null;
      const roster = call('squad', 'member', 'list', squad.id);
      if (op.action === 'remove') return roster.some(member => member.member_id === op.before.member_id) ? memberRecord(roster.find(member => member.member_id === op.before.member_id)) : null;
      const role = op.after, member = roster.find(item => item.member_id === findLive(live, 'agent', role)?.id && item.member_type === 'agent');
      return member ? memberRecord(member) : null;
    }
    if (op.entity === 'skill') {
      const record = findRecord('skill', op);
      if (!record) return null;
      const detail = call('skill', 'get', record.id, '--with-content');
      return { sha256: sha256(detail.content ?? ''), files: fileDigest(detail.files) };
    }
    if (op.entity === 'project-workflow') {
      const record = call('project', 'workflow', 'get', op.id);
      const target = live.workflows.find(item => item.name === op.workflow_name);
      return { workflow: target && record.workflow?.id === target.id ? op.after.workflow : (record.workflow?.id ?? null) };
    }
    if (op.entity === 'workflow') {
      const record = findRecord('workflow', op);
      return record ? { name: record.name, description: record.description ?? '', steps: workflowSteps(live, binding, record.steps) } : null;
    }
    if (op.entity === 'schedule') {
      const record = live.autopilots.find(pilot => pilot.title === op.title) ?? null;
      if (!record) return null;
      const detail = call('autopilot', 'get', record.id), triggers = detail.triggers ?? [];
      if (!triggers.length) return [];
      if (triggers.length !== 1 || !triggers[0].enabled || triggers[0].kind !== 'schedule') throw new Error('Schedule readback mismatch');
      return { cron: triggers[0].cron_expression, timezone: triggers[0].timezone };
    }
    if (op.entity === 'sync' || op.entity === 'autopilot') {
      const record = findRecord('autopilot', op);
      if (!record) return null;
      return { title: record.title, description: (record.description ?? '').trim(), assignee_role: roleOf(live, record.assignee_id),
        execution_mode: record.execution_mode,
        issue_title_template: record.issue_title_template, subscribers: subscribers(record) };
    }
    const record = findRecord(op.entity, op);
    if (!record) return null;
    if (op.entity === 'agent' && record.archived_at) return { name: record.name, archived: true };
    return pick(record, Object.keys(op.after));
  };
  for (const op of plan.operations) {
    const after = desired(op), actual = readOperation(op);
    if (same(actual, after)) continue;
    const pruning = op.action === 'archive' || op.action === 'delete';
    if (op.action === 'create') {
      if (actual !== null) throw new Error(`Create conflict: ${op.entity}.${op.key} already exists`);
    } else if (!pruning && actual !== null && !same(actual, op.before)) {
      throw new Error(`Sync conflict: ${op.entity}.${op.key}; live state changed between plan and apply`);
    }
    if (op.action === 'rename') {
      const field = nameField(op.entity);
      call(op.entity, 'update', op.id, `--${field}`, op.after[field]);
      const record = findRecord(op.entity, op);
      if (record) record[field] = op.after[field];
      continue;
    }
    if (op.action === 'archive' || op.action === 'delete') {
      call(op.entity, op.action === 'archive' ? 'archive' : 'delete', op.id);
      const list = live[group(op.entity)], index = list.findIndex(item => item.id === op.id);
      if (index !== -1) list.splice(index, 1);
      continue;
    }
    let id = op.id ?? null;
    if (op.action === 'restore') {
      call('agent', 'restore', id);
      refresh('agent', id);
    }
    if (op.action === 'create' && op.entity !== 'workflow') {
      let response;
      if (op.entity === 'skill') {
        const temp = mkdtempSync(join(root, '.skill-import-'));
        try {
          const path = join(root, 'skills', op.key), archive = join(temp, `${op.key}.zip`);
          if (pack) pack(path, archive); else execFileSync('zip', ['-q', '-r', archive, '.'], { cwd: path, stdio: 'pipe' });
          const imported = call('skill', 'import', '--file', archive);
          if (imported.status !== 'created') throw new Error('Skill import did not create resource; inspect before retry');
          response = imported.skill;
        } finally { rmSync(temp, { recursive: true, force: true }); }
      } else if (op.entity === 'label') response = call('label', 'create', '--name', after.name, '--color', after.color,
        '--description', after.description, '--resource-type', after.resource_type);
      else if (op.entity === 'agent') response = call('agent', 'create', ...flags(after));
      else if (op.entity === 'squad') response = call('squad', 'create', '--name', after.name, '--description', after.description,
        '--leader', idOf(live, 'agent', after.leader));
      else response = call('autopilot', 'create', '--title', after.title, '--agent', idOf(live, 'agent', after.assignee_role),
        '--description', after.description, '--mode', after.execution_mode, '--subscriber', binding.human_user_id,
        ...(after.issue_title_template ? ['--issue-title-template', after.issue_title_template] : []));
      if (typeof response?.id !== 'string') throw new Error(`Create response missing identity: ${op.entity}.${op.key}`);
      op.id = response.id;
      refresh(op.entity === 'sync' ? 'autopilot' : op.entity, response.id);
      id = response.id;
    }
    if (op.entity === 'agent' && op.action !== 'create') {
      call('agent', 'update', id, ...flags(after));
      refresh('agent', id);
    }
    if (op.entity === 'label' && op.action === 'update') {
      call('label', 'update', id, '--name', after.name, '--color', after.color, '--description', after.description);
      refresh('label', id);
    }
    if (op.entity === 'skill' && op.action === 'update') {
      updateSkill(op, id, call, assets, root);
      refresh('skill', id);
    }
    if (op.entity === 'agent-skills') {
      const agentId = id ?? idOf(live, 'agent', op.key);
      call('agent', 'skills', 'set', agentId, '--skill-ids', after.join(','));
      refresh('agent', agentId);
    }
    if (op.entity === 'squad') {
      const { leader, ...fields } = after;
      call('squad', 'update', id, ...flags(fields), '--leader', idOf(live, 'agent', leader));
      refresh('squad', id);
    }
    if (op.entity === 'member') {
      const squadId = id ?? findRecord('squad', op).id;
      if (op.action === 'remove') call('squad', 'member', 'remove', squadId, '--member-id', op.before.member_id);
      else call('squad', 'member', 'add', squadId, '--member-id', idOf(live, 'agent', op.after), '--type', 'agent', '--role', op.after);
      refresh('squad', squadId);
    }
    if (op.entity === 'autopilot' && op.action !== 'create') {
      call('autopilot', 'update', id, '--title', after.title, '--agent', idOf(live, 'agent', after.assignee_role),
        '--description', after.description, ...(after.issue_title_template ? ['--issue-title-template', after.issue_title_template] : []));
      refresh('autopilot', id);
    }
    if (op.entity === 'sync') {
      call('autopilot', 'update', id, '--title', after.title, '--agent', idOf(live, 'agent', after.assignee_role),
        '--description', after.description, '--issue-title-template', after.issue_title_template);
      refresh('sync', id);
    }
    if (op.entity === 'workflow') {
      const concrete = { ...after, steps: concreteSteps(live, binding, after.steps) };
      const temp = mkdtempSync(join(root, '.workflow-'));
      try {
        const writeSteps = (steps, existing) => {
          const path = join(temp, 'steps.json');
          const newStatuses = op.new_statuses ?? {};
          writeFileSync(path, JSON.stringify(steps.map(step => newStatuses[step.status_key] && !existing?.has(step.status_key) ? { new_status: newStatuses[step.status_key] } : { status_key: step.status_key })));
          return path;
        };
        if (op.action === 'create') {
          const response = call('workflow', 'create', '--name', concrete.name, '--description', concrete.description, '--steps-file', writeSteps(concrete.steps));
          if (typeof response?.id !== 'string') throw new Error('Create response missing identity: workflow');
          op.id = id = response.id;
          refresh('workflow', id);
        } else {
          const record = findRecord('workflow', op);
          if (!same(record.steps.map(step => step.status_key), concrete.steps.map(step => step.status_key)))
            call('workflow', 'update', id, '--name', concrete.name, '--description', concrete.description,
              '--steps-file', writeSteps(concrete.steps, new Set(record.steps.map(step => step.status_key))));
          else if (record.name !== concrete.name || (record.description ?? '') !== concrete.description)
            call('workflow', 'update', id, '--name', concrete.name, '--description', concrete.description);
          refresh('workflow', id);
        }
        for (const [index, step] of concrete.steps.entries()) {
          if (step.handler.type === 'none' && !step.instructions && !step.next_status_key && !step.back_status_key) continue;
          const path = join(temp, `step-${index}.md`);
          writeFileSync(path, step.instructions ?? '');
          call('workflow', 'handoff', 'set', id, step.status_key, '--handler', handlerArg(step.handler),
            '--instructions-file', path, '--next', step.next_status_key ?? '', '--back', step.back_status_key ?? '');
        }
        refresh('workflow', id);
      } finally { rmSync(temp, { recursive: true, force: true }); }
    }
    if (op.entity === 'project-workflow') call('project', 'workflow', 'set', op.id, idOf(live, 'workflow', op.workflow_name));
    if (op.entity === 'schedule') {
      const pilot = live.autopilots.find(item => item.title === op.title);
      call('autopilot', 'trigger-add', id ?? pilot.id, '--kind', 'schedule', '--cron', after.cron, '--timezone', after.timezone);
      refresh('autopilot', id ?? pilot.id);
    }
    if (!same(readOperation(op), desired(op))) throw new Error(`Readback mismatch: ${op.entity}.${op.key}; inspect live state before retry`);
  }
  // A chained rename moves the same object again, so only its own step can be compared to the intermediate name.
  for (const op of [...plan.operations, ...plan.checks]) if (op.action !== 'rename' && !same(readOperation(op), desired(op))) throw new Error(`Final readback mismatch: ${op.entity}.${op.key}`);
  return { status: 'verified', plan_hash: plan.plan_hash, operations: plan.operations.length,
    pruned: plan.operations.filter(op => op.action === 'archive' || op.action === 'delete').length,
    retired: plan.operations.filter(op => op.action === 'archive' || op.action === 'delete').map(op => ({ entity: op.entity, key: op.key })),
    sync_control: plan.sync_control,
    migrations: plan.operations.filter(op => op.action === 'rename').map(op => op.key) };
}
