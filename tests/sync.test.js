import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deploy, buildPlan } from '../scripts/deploy.js';
import { readJSON } from '../scripts/config.js';
import { fixture, apply, writes } from './support/helpers.js';
import { id } from './support/platform.js';

const project = id(700);
const withProject = f => { f.state.projects = [{ id: project, title: 'demo' }]; };
const journal = f => readJSON(join(f.stateDirectory, 'fixture.json'));

test('read-only plan enumerates the operation set without platform writes or a committed manifest', t => {
  const f = fixture(t);
  const plan = deploy(f.binding, false, f);
  assert.equal(plan.workspace_id, id(1));
  assert.equal(plan.operations.filter(op => op.entity === 'agent').length, 5);
  assert.equal(plan.operations.filter(op => op.entity === 'workflow').length, 1);
  assert.equal(writes(f.state).length, 0);
  assert.ok(!readdirSync(f.root).includes('workspaces'));
});

test('apply creates the five-role roster and the factory workflow, binds the project and plans a no-op', t => {
  const f = fixture(t); withProject(f); apply(f);
  assert.equal(f.state.agents.length, 5);
  assert.equal(f.state.workflows.length, 1);
  assert.equal(f.state.autopilots.length, 0);
  assert.equal(f.state.projectWorkflows[project], f.state.workflows[0].id);
  for (const agent of f.state.agents) {
    assert.equal(agent.runtime_id, id(2));
    assert.equal(agent.model, 'deepseek-official/deepseek-flash');
    assert.equal(agent.thinking_level, agent.name === 'release' ? 'low' : 'high');
    assert.match(agent.instructions, /Use Conventional Commits/);
    assert.match(agent.instructions, /github\.com\/example\/multica-workspace/);
  }
  const workflow = f.state.workflows[0];
  assert.deepEqual(workflow.steps.map(step => step.status_key), ['backlog', 'todo', 'spec_progress', 'spec_review', 'in_progress', 'in_review', 'awaiting_merge', 'blocked', 'done', 'cancelled']);
  const planner = f.state.agents.find(agent => agent.name === 'planner').id;
  const reviewer = f.state.agents.find(agent => agent.name === 'reviewer').id;
  assert.equal(workflow.steps.find(step => step.status_key === 'spec_progress').handler.id, planner);
  assert.equal(workflow.steps.find(step => step.status_key === 'spec_review').handler.id, reviewer);
  assert.equal(workflow.steps.find(step => step.status_key === 'spec_review').back_status_key, 'spec_progress');
  assert.equal(workflow.steps.find(step => step.status_key === 'in_progress').handler.id, f.state.agents.find(agent => agent.name === 'implementer').id);
  assert.equal(workflow.steps.find(step => step.status_key === 'in_review').handler.id, reviewer);
  assert.equal(workflow.steps.find(step => step.status_key === 'awaiting_merge').handler.id, f.state.human);
  assert.equal(workflow.steps.find(step => step.status_key === 'blocked').handler.id, planner);
  assert.equal(f.state.labels.length, 14);
  assert.equal(journal(f).status, 'verified');
  f.state.calls = [];
  apply(f);
  assert.equal(writes(f.state).length, 0);
  assert.equal(buildPlan(f.binding, f).operations.length, 0);
});

test('a same-name live agent is updated in place, never duplicated', t => {
  const f = fixture(t);
  f.state.agents.push({ id: id(777), name: 'release', model: 'stale' });
  apply(f);
  assert.equal(f.state.agents.filter(agent => agent.name === 'release').length, 1);
  assert.equal(f.state.agents.find(agent => agent.name === 'release').id, id(777));
  assert.equal(f.state.agents.length, 5);
});

test('an archived agent with a declared name is restored with its identity', t => {
  const f = fixture(t); apply(f);
  const release = f.state.agents.find(agent => agent.name === 'release');
  release.archived_at = '2026-01-01T00:00:00Z';
  f.state.calls = [];
  apply(f);
  assert.equal(f.state.agents.find(agent => agent.name === 'release').id, release.id);
  assert.equal(f.state.agents.filter(agent => agent.name === 'release').length, 1);
  assert.ok(f.state.calls.some(call => call[1] === 'agent' && call[2] === 'restore'));
});

test('a lost create response is recovered by name on the next run', t => {
  const f = fixture(t); let lost = false;
  const runner = (...args) => {
    const result = f.runner(...args);
    if (!lost && args[1] === 'agent' && args[2] === 'create') { lost = true; throw Error('lost response'); }
    return result;
  };
  assert.throws(() => apply(f, { runner }), /lost response/);
  assert.equal(f.state.agents.length, 1);
  apply(f);
  assert.equal(f.state.agents.length, 5);
  assert.equal(f.state.agents.filter(agent => agent.name === 'general').length, 1);
});

test('a foreign or ambiguous binding refuses every mutation', t => {
  for (const mutate of [
    f => { f.state.agents.push({ id: id(55), name: 'general' }, { id: id(56), name: 'general' }); },
    f => { f.state.runtime.workspace_id = id(9); },
    f => { f.state.human = id(58); },
    f => { f.state.workspace.id = id(99); },
    f => {
      f.state.agents.push({ id: id(59), name: 'Unrelated' });
      f.state.issues.push({ id: id(60), identifier: 'MIR-1', status: 'todo', assignee_id: id(59) });
    },
  ]) {
    const f = fixture(t); mutate(f); f.state.calls = [];
    assert.throws(() => apply(f));
    assert.equal(writes(f.state).length, 0);
  }
});

test('a partial run re-plans from live state and corrects third-state drift', t => {
  const f = fixture(t); let broken = false;
  const runner = (...args) => {
    if (!broken && args[1] === 'agent' && args[2] === 'get') { broken = true; throw Error('stop'); }
    return f.runner(...args);
  };
  assert.throws(() => apply(f, { runner }), /stop/);
  f.state.agents[0].model = 'drifted';
  apply(f);
  assert.equal(f.state.agents[0].model, 'deepseek-official/deepseek-flash');
  assert.equal(journal(f).status, 'verified');
});

test('a failed final readback never records verification', t => {
  const f = fixture(t);
  const runner = (...args) => { const record = f.runner(...args); if (args[1] === 'agent' && args[2] === 'get') record.model = 'wrong'; return record; };
  assert.throws(() => apply(f, { runner }), /Readback mismatch|conflict/);
  assert.equal(journal(f).status, 'partially-applied');
});

test('a source change during a partial run refuses to resume', t => {
  const f = fixture(t); let broken = false;
  const runner = (...args) => {
    if (!broken && args[1] === 'agent' && args[2] === 'get') { broken = true; throw Error('stop'); }
    return f.runner(...args);
  };
  assert.throws(() => apply(f, { runner }), /stop/);
  assert.throws(() => deploy(f.binding, true, { ...f, source: () => ({ revision: 'c'.repeat(40), tree: 'd'.repeat(40) }) }), /Source changed during partial sync/);
});

test('verified journals survive subsequent runs as immutable recovery evidence', t => {
  const f = fixture(t); apply(f);
  const before = journal(f);
  apply(f);
  const archive = readdirSync(f.stateDirectory).filter(name => name !== 'fixture.json' && name.endsWith('.json'));
  assert.equal(archive.length, 1);
  assert.deepEqual(readJSON(join(f.stateDirectory, archive[0])), before);
});

test('required skills attach by id and clear unrelated ones without touching runtime-supplied skills', t => {
  const f = fixture(t); apply(f);
  const agent = f.state.agents.find(a => a.name === 'reviewer');
  agent.skills = [{ id: id(777) }];
  agent.runtime_skills = [id(778)];
  apply(f);
  const codeReview = f.state.skills.find(skill => skill.name === 'code-review').id;
  assert.deepEqual(agent.skills, [{ id: codeReview }]);
  assert.deepEqual(agent.runtime_skills, [id(778)]);
});

test('an unmanaged live object is retired and absence from the catalog is the whole declaration', t => {
  const f = fixture(t); apply(f);
  f.state.agents.push({ id: id(880), name: 'retired-seat' });
  f.state.labels.push({ id: id(881), name: 'stale-label', color: '#111111', description: 'x', resource_type: 'issue', usage_count: 0 });
  f.state.skills.push({ id: id(882), name: 'stale-skill', content: 'x', files: [] });
  const result = apply(f);
  assert.ok(f.state.agents.find(agent => agent.id === id(880)).archived_at);
  assert.ok(!f.state.labels.some(label => label.id === id(881)));
  assert.ok(!f.state.skills.some(skill => skill.id === id(882)));
  assert.deepEqual(result.retired.map(item => item.key).sort(), ['retired-seat', 'stale-label', 'stale-skill']);
});

test('retiring an agent with open issues refuses and names them', t => {
  const f = fixture(t); apply(f);
  f.state.agents.push({ id: id(883), name: 'owner-of-open' });
  f.state.issues.push({ id: id(884), identifier: 'MIR-9', status: 'in_progress', assignee_id: id(883) });
  f.state.calls = [];
  assert.throws(() => apply(f), /owner-of-open owns open issues: MIR-9/);
  assert.equal(writes(f.state).length, 0);
});

test('retiring a used label refuses unless a ledger retire event authorizes it', t => {
  const f = fixture(t); apply(f);
  f.state.labels.push({ id: id(885), name: 'in-use', color: '#111111', description: 'x', resource_type: 'issue', usage_count: 4 });
  assert.throws(() => apply(f), /in-use is used by 4 issue/);
  writeFileSync(join(f.root, 'migrations/changelog.jsonl'), `${JSON.stringify({ kind: 'retire', entity: 'label', name: 'in-use' })}\n`);
  apply(f);
  assert.ok(!f.state.labels.some(label => label.id === id(885)));
});

test('--keep-unmanaged leaves undeclared live objects untouched', t => {
  const f = fixture(t); apply(f);
  f.state.agents.push({ id: id(886), name: 'keep-me' });
  f.state.calls = [];
  const plan = deploy(f.binding, false, { ...f, keepUnmanaged: true });
  assert.ok(!plan.operations.some(op => op.action === 'archive' && op.key === 'keep-me'));
  assert.equal(writes(f.state).length, 0);
});

test('an undeclared autopilot is never deleted implicitly; a retire event authorizes it', t => {
  const f = fixture(t); apply(f);
  f.state.autopilots.push({ id: id(887), title: 'Legacy sweep', status: 'active', triggers: [] });
  f.state.calls = [];
  assert.throws(() => apply(f), /Unmanaged autopilot Legacy sweep; scope a retire event/);
  assert.equal(writes(f.state).length, 0);
  writeFileSync(join(f.root, 'migrations/changelog.jsonl'), `${JSON.stringify({ kind: 'retire', entity: 'autopilot', name: 'Legacy sweep', workspaces: ['fixture'] })}\n`);
  apply(f);
  assert.ok(!f.state.autopilots.some(pilot => pilot.id === id(887)));
});

test('the sync control is refreshed by title but its status and triggers stay operator state', t => {
  const f = fixture(t); apply(f);
  const control = { id: id(910), title: 'Daily catalog sync', description: 'old', assignee_id: f.state.agents.find(a => a.name === 'general').id,
    status: 'paused', triggers: [{ id: id(911), kind: 'webhook', enabled: true }], execution_mode: 'create_issue', issue_title_template: 'Daily catalog sync — {{date}}', subscribers: [] };
  f.state.autopilots.push(control);
  const result = apply(f);
  assert.equal(result.sync_control, 'configured');
  const live = f.state.autopilots.find(pilot => pilot.id === id(910));
  assert.match(live.description, /Synchronize this workspace/);
  assert.equal(live.status, 'paused');
  assert.deepEqual(live.triggers, [{ id: id(911), kind: 'webhook', enabled: true }]);
  assert.equal(f.state.autopilots.length, 1);
});

test('an absent sync control is reported, never created by a sync', t => {
  const f = fixture(t);
  const result = apply(f);
  assert.equal(result.sync_control, 'absent');
  assert.equal(f.state.autopilots.length, 0);
});
