/** The shared migration ledger: ordered, repo-authored events the catalog cannot express. */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const LEDGER_PATH = 'migrations/changelog.jsonl';
export const ENTITIES = ['agent', 'autopilot', 'label', 'skill', 'squad', 'workflow'];

export function loadLedger(root) {
  const path = join(root, LEDGER_PATH);
  if (!existsSync(path)) return [];
  return readFileSync(path, 'utf8').split('\n').flatMap((line, index) => {
    if (!line.trim()) return [];
    try { return [{ ...JSON.parse(line), line: index + 1 }]; }
    catch { throw new Error(`Migration ledger line ${index + 1}: invalid JSON`); }
  });
}

const applies = (event, scope) => !event.workspaces || event.workspaces.includes(scope);

/** Validate the ledger against one workspace's resolved catalog.
 *  Events scoped elsewhere are ignored here; an event must name a declared end state,
 *  must not collide with a still-declared name, and may chain to a later event. */
export function validateLedger(events, { validate, declared, scope }) {
  for (const event of events) {
    const { line, ...body } = event;
    try { validate(body); } catch (error) { throw new Error(`Migration ledger line ${line}: ${error.message}`); }
    if (event.entity === 'autopilot' && !event.workspaces) throw new Error(`Migration ledger line ${event.line}: autopilot titles are rendered per workspace; add workspaces`);
  }
  const applicable = events.filter(event => applies(event, scope));
  const seen = new Set();
  for (const [index, event] of applicable.entries()) {
    if (event.kind === 'rename') {
      if (typeof event.from !== 'string' || typeof event.to !== 'string' || event.from === event.to)
        throw new Error(`Migration ledger line ${event.line}: rename needs distinct from/to`);
      if (event.name !== undefined) throw new Error(`Migration ledger line ${event.line}: rename takes from/to, not name`);
      const identity = `${event.entity}:${event.from}`;
      if (seen.has(identity)) throw new Error(`Migration ledger line ${event.line}: duplicate rename source ${event.from}`);
      seen.add(identity);
      const declaredNames = declared[event.entity];
      if (declaredNames.has(event.from)) throw new Error(`Migration ledger line ${event.line}: ${event.from} is still declared; remove the old name first`);
      const chained = applicable.slice(index + 1).some(later => later.kind === 'rename' && later.entity === event.entity && later.from === event.to);
      if (!declaredNames.has(event.to) && !chained) throw new Error(`Migration ledger line ${event.line}: ${event.to} is neither declared nor renamed later`);
    } else if (event.kind === 'retire') {
      if (typeof event.name !== 'string') throw new Error(`Migration ledger line ${event.line}: retire needs name`);
      if (event.from !== undefined || event.to !== undefined) throw new Error(`Migration ledger line ${event.line}: retire takes name, not from/to`);
      if (declared[event.entity].has(event.name)) throw new Error(`Migration ledger line ${event.line}: ${event.name} is still declared; remove it from the catalog first`);
    }
  }
  return applicable;
}
