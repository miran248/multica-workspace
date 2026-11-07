/** The only platform boundary: every read and write goes through this runner. */
import { execFileSync } from 'node:child_process';

// `skill delete`, `skill files delete` and `autopilot delete` take no --output flag; the
// first two also print nothing on success, so they cannot share the JSON-shaped call path.
const silent = args =>
  (args[0] === 'skill' && (args[1] === 'delete' || (args[1] === 'files' && args[2] === 'delete')))
  || (args[0] === 'autopilot' && args[1] === 'delete');

// `skill delete` otherwise waits at a confirmation prompt and blocks the run.
const confirmed = args => args[0] === 'skill' && args[1] === 'delete' ? ['--yes'] : [];

export function run(workspace, ...args) {
  const output = silent(args) ? [] : ['--output', 'json'];
  const text = execFileSync('multica', [...(workspace ? ['--workspace-id', workspace] : []), ...args, ...confirmed(args), ...output], {
    encoding: 'utf8', stdio: ['inherit', 'pipe', 'inherit'], maxBuffer: 16 * 1024 * 1024,
  }).trim();
  return silent(args) ? text : (text ? JSON.parse(text) : null);
}

export const unpack = (value, key) => Array.isArray(value) ? value : value[key];
