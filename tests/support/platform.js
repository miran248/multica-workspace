// Stateful CLI double: no credentials or platform access.
import { readFileSync } from 'node:fs';

export const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
export function initialState() {
  return { workspace: { id: id(1), slug: 'fixture', name: 'Fixture' }, runtime: { id: id(2), workspace_id: id(1), provider: 'dsh', status: 'online' }, human: id(3), humanName: 'miran', agents: [], skills: [], squads: [], labels: [], autopilots: [], workflows: [], projectWorkflows: {}, projects: [], issues: [], calls: [], next: 10 };
}
export function command(state, workspace, ...args) {
  state.calls.push([workspace, ...args]);
  const [entity, action, third] = args;
  const flags = {};
  for (let i = 0; i < args.length; i++) if (args[i].startsWith('--')) flags[args[i].slice(2).replaceAll('-', '_')] = args[++i];
  if (entity === 'workspace' && action === 'list') return { workspaces: [state.workspace] };
  if (!workspace && entity === 'workspace' && action === 'get') return state.workspace;
  if (workspace !== state.workspace.id) throw new Error('Fake received wrong workspace');
  if (entity === 'workspace' && action === 'get') return state.workspace;
  if (entity === 'workspace' && action === 'member') return { members: [{ user_id: state.human, role: 'owner', name: state.humanName }] };
  if (entity === 'runtime' && action === 'list') return [state.runtime];
  if (entity === 'autopilot' && action === 'runs') return state.runs ?? [];
  if (entity === 'project' && action === 'list') return state.projects;
  if (entity === 'issue' && action === 'list') {
    const matching = state.issues.filter(issue => !flags.assignee_id || issue.assignee_id === flags.assignee_id);
    const offset = Number(flags.offset ?? 0), limit = Number(flags.limit ?? 50);
    const page = matching.slice(offset, offset + limit).map(issue => ({ identifier: issue.identifier, status: issue.status }));
    return { issues: page, has_more: offset + page.length < matching.length };
  }
  if (entity === 'project' && action === 'workflow') {
    const project = args[3];
    if (third === 'set') { state.projectWorkflows[project] = args[4]; return {}; }
    const bound = state.projectWorkflows[project];
    if (bound) return { project_id: project, uses_default: false, workflow: state.workflows.find(w => w.id === bound) };
    return { project_id: project, uses_default: true, workflow: { id: id(800), name: 'Default', steps: [] } };
  }
  if (entity === 'workflow' && action === 'list') return state.workflows;
  if (entity === 'workflow' && action === 'create') {
    const parsed = JSON.parse(readFileSync(flags.steps_file, 'utf8'));
    const steps = parsed.map(step => ({ status_key: step.new_status ? step.new_status.name.toLowerCase().replace(/[^a-z0-9]+/g, '_') : step.status_key,
      handler: { type: 'none' }, instructions: '' }));
    const record = { id: id(state.next++), name: flags.name, description: flags.description ?? '', steps };
    state.workflows.push(record); return record;
  }
  if (entity === 'workflow' && action === 'update') {
    const record = state.workflows.find(w => w.id === third);
    if (!record) throw new Error(`Missing workflow ${third}`);
    if (flags.name) record.name = flags.name;
    if (flags.description !== undefined) record.description = flags.description;
    if (flags.steps_file) record.steps = JSON.parse(readFileSync(flags.steps_file, 'utf8')).map(step => ({ status_key: step.new_status ? step.new_status.name.toLowerCase().replace(/[^a-z0-9]+/g, '_') : step.status_key, handler: { type: 'none' }, instructions: '' }));
    return record;
  }
  if (entity === 'workflow' && action === 'handoff' && third === 'set') {
    const record = state.workflows.find(w => w.id === args[3]);
    const step = record.steps.find(item => item.status_key === args[4]);
    if (!step) throw new Error(`Missing workflow step ${args[4]}`);
    const handler = flags.handler;
    step.handler = ['none', 'project_lead', 'creator'].includes(handler) ? { type: handler }
      : state.agents.some(agent => agent.id === handler) ? { type: 'agent', id: handler } : { type: 'member', id: handler };
    step.instructions = flags.instructions_file ? readFileSync(flags.instructions_file, 'utf8') : (flags.instructions ?? '');
    if (flags.next) step.next_status_key = flags.next; else delete step.next_status_key;
    if (flags.back) step.back_status_key = flags.back; else delete step.back_status_key;
    return record;
  }
  if (entity === 'skill' && action === 'import') {
    const name = flags.file.split('/').at(-1).slice(0, -4);
    const content = state.importContent?.[name];
    const files = state.importFiles?.[name] ?? [];
    const record = { id: id(state.next++), name, content, files };
    state.skills.push(record); return { status: 'created', skill: record };
  }
  if (entity === 'skill' && action === 'update') {
    const record = state.skills.find(skill => skill.id === third);
    if (!record) throw new Error(`Missing skill ${third}`);
    if (flags.content_file !== undefined || flags.content !== undefined)
      record.content = flags.content_file ? readFileSync(flags.content_file, 'utf8') : flags.content;
    for (const key of ['name', 'description']) if (flags[key] !== undefined) record[key] = flags[key];
    return record;
  }
  if (entity === 'skill' && action === 'files') {
    const sub = third, skillId = args[3], record = state.skills.find(skill => skill.id === skillId);
    if (!record) throw new Error(`Missing skill ${skillId}`);
    if (sub === 'list') return record.files;
    if (sub === 'upsert') {
      const content = flags.content_file ? readFileSync(flags.content_file, 'utf8') : flags.content;
      const existing = record.files.find(file => file.path === flags.path);
      if (existing) { existing.content = content; return existing; }
      const file = { id: id(state.next++), path: flags.path, content };
      record.files.push(file); return file;
    }
    if (sub === 'delete') { record.files = record.files.filter(file => file.id !== args[4]); return {}; }
    throw new Error(`Unexpected skill files ${sub}`);
  }
    const records = state[`${entity}s`];
  if (!records) throw new Error(`Unexpected entity ${entity}`);
  if (action === 'list') return entity === 'autopilot' ? { autopilots: records } : records;
  if (action === 'create') {
    const record = { id: id(state.next++), ...flags };
    if (entity === 'agent') { record.max_concurrent_tasks = Number(record.max_concurrent_tasks); record.skills = []; }
    if (entity === 'squad') { record.leader_id = record.leader; delete record.leader; record.members = []; }
    if (entity === 'autopilot') {
      record.assignee_id = record.agent; record.project_id = record.project ?? null; record.status = 'active'; record.triggers = [];
      record.execution_mode = record.mode;
      record.subscribers = record.subscriber ? [{ user_id: record.subscriber, user_type: 'member' }] : [];
    }
    if (entity === 'label') record.usage_count = record.usage_count ?? 0;
    if (entity === 'agent') record.archived_at = record.archived_at ?? null;
    records.push(record); return record;
  }
  const recordId = ['member', 'skills'].includes(action) ? args[3] : third;
  const record = records.find(r => r.id === recordId);
  if (!record) throw new Error(`Missing ${entity} ${recordId}`);
  if (action === 'get') return entity === 'autopilot' ? { autopilot: record, triggers: record.triggers } : record;
  if (action === 'archive') { record.archived_at = new Date().toISOString(); return record; }
  if (action === 'restore') { delete record.archived_at; return record; }
  if (action === 'delete') {
    if (entity === 'workflow' && Object.values(state.projectWorkflows).includes(record.id)) throw new Error('workflow is in use by a project');
    state[`${entity}s`] = records.filter(item => item.id !== recordId); return {};
  }
  if (action === 'update') {
    Object.assign(record, flags);
    // The platform adds an absent new leader as a member with role `leader`.
    if (entity === 'squad' && flags.leader) {
      record.leader_id = flags.leader;
      if (!record.members.some(member => member.member_id === flags.leader && member.member_type === 'agent'))
        record.members.push({ member_id: flags.leader, member_type: 'agent', role: 'leader' });
    }
    if (entity === 'autopilot' && flags.agent) record.assignee_id = flags.agent;
    if (entity === 'agent') record.max_concurrent_tasks = Number(record.max_concurrent_tasks);
    return record;
  }
  if (action === 'skills') { record.skills = flags.skill_ids ? flags.skill_ids.split(',').map(id => ({ id })) : []; return {}; }
  if (action === 'member' && third === 'list') return record.members;
  if (action === 'member' && third === 'add') { record.members.push({ member_id: flags.member_id, member_type: flags.type, role: flags.role }); return {}; }
  if (action === 'member' && third === 'remove') {
    if (flags.member_id === record.leader_id) throw new Error('cannot remove the squad leader; change leader first');
    record.members = record.members.filter(member => member.member_id !== flags.member_id); return {};
  }
  if (action === 'trigger-add') { record.triggers.push({ id: id(state.next++), kind: flags.kind, enabled: true, cron_expression: flags.cron, timezone: flags.timezone }); return {}; }
  if (action === 'trigger-update') {
    const trigger = record.triggers.find(item => item.id === args[3]);
    if (!trigger) throw new Error(`Missing trigger ${args[3]}`);
    if (flags.cron) trigger.cron_expression = flags.cron;
    if (flags.timezone) trigger.timezone = flags.timezone;
    trigger.enabled = flags.enabled !== false;
    return trigger;
  }
  throw new Error(`Unexpected command ${args}`);
}
