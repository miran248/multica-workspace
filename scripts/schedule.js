/** Install or refresh the scheduled sync: create the control autopilot if missing, then
 *  ensure exactly one enabled schedule trigger. Triggers are operator state: a webhook is
 *  left alone, and extra schedule triggers refuse instead of being deleted. */
import { parseArgs } from 'node:util';
import { ROOT } from './config.js';
import { entrypoint } from './cli.js';
import { run } from './platform.js';
import { resolveWorkspace } from './workspace.js';
import { resolvedForDeployment, discover, idOf } from './deployment.js';

const USAGE = 'schedule [--runtime-id ID] [--app-url URL]';

export function schedule(options = {}) {
  const { root = ROOT, runner = run } = options;
  const resolved = resolveWorkspace(options);
  if (!resolved.repository) throw new Error("No GitHub origin: the rendered prompt must carry this catalog's own URL. Add one with `git remote add origin <url>`.");
  const { binding } = resolved;
  const output = resolvedForDeployment(binding, { root });
  const call = (...args) => runner(binding.workspace_id, ...args);
  const live = discover(call);
  const target = output.sync;
  const agentId = idOf(live, 'agent', target.role);
  const runControl = record => ({ title: target.title, description: target.deployment_prompt.trim(),
    assignee_role: target.role, execution_mode: target.execution_mode, issue_title_template: target.issue_title_template });
  let record = live.autopilots.find(pilot => pilot.title === target.title) ?? null;
  const created = !record;
  if (created) {
    const response = call('autopilot', 'create', '--title', target.title, '--agent', agentId,
      '--description', runControl().description, '--mode', target.execution_mode,
      '--subscriber', binding.human_user_id, '--issue-title-template', target.issue_title_template);
    if (typeof response?.id !== 'string') throw new Error('Create response missing identity: config-sync');
    record = response;
  } else {
    call('autopilot', 'update', record.id, '--title', target.title, '--agent', agentId,
      '--description', runControl().description, '--issue-title-template', target.issue_title_template);
  }
  const detail = call('autopilot', 'get', record.id);
  const schedules = (detail.triggers ?? []).filter(trigger => trigger.kind === 'schedule');
  if (schedules.length > 1) throw new Error(`Sync control has ${schedules.length} schedule triggers; remove the extras before re-running`);
  if (!schedules.length) {
    call('autopilot', 'trigger-add', record.id, '--kind', 'schedule', '--cron', target.cron, '--timezone', target.timezone);
  } else {
    const trigger = schedules[0];
    if (trigger.cron_expression !== target.cron || trigger.timezone !== target.timezone || trigger.enabled !== true) {
      call('autopilot', 'trigger-update', record.id, trigger.id, '--cron', target.cron, '--timezone', target.timezone,
        ...(trigger.enabled === true ? [] : ['--enabled']));
    }
  }
  const verified = call('autopilot', 'get', record.id);
  return { created, autopilot: record.id, title: target.title, cron: target.cron, timezone: target.timezone,
    triggers: (verified.triggers ?? []).length };
}

export function main(args = process.argv.slice(2)) {
  const parsed = parseArgs({ args, allowPositionals: true, options: {
    'runtime-id': { type: 'string' }, 'app-url': { type: 'string' }, help: { type: 'boolean', short: 'h' },
  } });
  if (parsed.values.help) { console.log(USAGE); return; }
  if (parsed.positionals.length) throw new Error('schedule takes no positional arguments');
  const result = schedule({ root: ROOT, runtimeId: parsed.values['runtime-id'], appUrl: parsed.values['app-url'] });
  console.log(JSON.stringify({ ...result, next: 'The schedule is live; `just sync` runs it once without touching the trigger.' }, null, 2));
}

entrypoint(import.meta.url, main);
