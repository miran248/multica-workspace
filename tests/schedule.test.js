import test from 'node:test';
import assert from 'node:assert/strict';
import { schedule } from '../scripts/schedule.js';
import { fixture, apply } from './support/helpers.js';
import { id } from './support/platform.js';

const options = f => ({ root: f.root, runner: f.runner, repository: f.binding.repository, log() {} });
const control = f => f.state.autopilots.find(pilot => pilot.title === 'Daily catalog sync');

test('schedule creates the control by title and one enabled UTC trigger at the catalog cron', t => {
  const f = fixture(t); apply(f);
  const result = schedule(options(f));
  assert.equal(result.created, true);
  assert.equal(result.cron, '0 8 * * *');
  assert.equal(result.timezone, 'UTC');
  const live = control(f);
  assert.ok(live);
  assert.equal(live.execution_mode, 'create_issue');
  assert.equal(live.issue_title_template, 'Daily catalog sync — {{date}}');
  assert.match(live.description, /github\.com\/example\/multica-workspace/);
  assert.deepEqual(live.triggers.map(trigger => [trigger.kind, trigger.enabled, trigger.cron_expression, trigger.timezone]),
    [['schedule', true, '0 8 * * *', 'UTC']]);
});

test('schedule is idempotent and never adds a second trigger', t => {
  const f = fixture(t); apply(f);
  schedule(options(f));
  const before = structuredClone(control(f).triggers);
  const calls = f.state.calls.length;
  schedule(options(f));
  assert.deepEqual(control(f).triggers, before);
  const newCalls = f.state.calls.slice(calls).map(call => call[2]);
  assert.ok(!newCalls.includes('trigger-add'));
  assert.equal(f.state.autopilots.length, 1);
});

test('an existing control is refreshed in place and a stale disabled trigger is updated', t => {
  const f = fixture(t); apply(f);
  const general = f.state.agents.find(agent => agent.name === 'general').id;
  f.state.autopilots.push({ id: id(920), title: 'Daily catalog sync', description: 'old', assignee_id: general,
    status: 'paused', execution_mode: 'create_issue', issue_title_template: 'old', subscribers: [],
    triggers: [{ id: id(921), kind: 'schedule', enabled: false, cron_expression: '0 9 * * *', timezone: 'UTC' }] });
  schedule(options(f));
  const live = control(f);
  assert.equal(live.id, id(920));
  assert.match(live.description, /Synchronize this workspace/);
  assert.equal(live.status, 'paused');
  assert.deepEqual(live.triggers.map(trigger => [trigger.id, trigger.kind, trigger.enabled, trigger.cron_expression, trigger.timezone]),
    [[id(921), 'schedule', true, '0 8 * * *', 'UTC']]);
  assert.equal(f.state.autopilots.length, 1);
});

test('a webhook trigger is operator state and survives a schedule refresh', t => {
  const f = fixture(t); apply(f);
  schedule(options(f));
  control(f).triggers.push({ id: id(930), kind: 'webhook', enabled: true });
  schedule(options(f));
  assert.deepEqual(control(f).triggers.map(trigger => trigger.kind), ['schedule', 'webhook']);
});

test('more than one schedule trigger refuses instead of deleting an operator trigger', t => {
  const f = fixture(t); apply(f);
  schedule(options(f));
  control(f).triggers.push({ id: id(940), kind: 'schedule', enabled: true, cron_expression: '0 9 * * *', timezone: 'UTC' });
  assert.throws(() => schedule(options(f)), /2 schedule triggers; remove the extras/);
  assert.equal(control(f).triggers.filter(trigger => trigger.kind === 'schedule').length, 2);
});

test('schedule refuses before writing when the catalog agents do not exist yet', t => {
  const f = fixture(t);
  assert.throws(() => schedule(options(f)), /Live agent not found by name: general/);
  assert.equal(f.state.autopilots.length, 0);
});
