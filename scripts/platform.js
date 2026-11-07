/** The only platform boundary: every read and write goes through this runner. */
import { execFileSync } from 'node:child_process';

// `skill files delete` takes no --output flag and prints nothing on success, so it
// cannot share the JSON-shaped call path every other command uses.
const silent = args => args[0] === 'skill' && args[1] === 'files' && args[2] === 'delete';

export function run(workspace, ...args) {
  const output = silent(args) ? [] : ['--output', 'json'];
  const text = execFileSync('multica', [...(workspace ? ['--workspace-id', workspace] : []), ...args, ...output], {
    encoding: 'utf8', stdio: ['inherit', 'pipe', 'inherit'], maxBuffer: 16 * 1024 * 1024,
  }).trim();
  return silent(args) ? text : (text ? JSON.parse(text) : null);
}

export const unpack = (value, key) => Array.isArray(value) ? value : value[key];
