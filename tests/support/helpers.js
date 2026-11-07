import { cpSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { ROOT, ROLES } from '../../scripts/config.js';
import { deploy } from '../../scripts/deploy.js';
import { id, initialState, command } from './platform.js';

export const catalogSkills = root => readdirSync(join(root, 'skills'), { withFileTypes: true })
  .filter(entry => entry.isDirectory()).map(entry => entry.name).sort();

export function readSkill(root, name) {
  const directory = join(root, 'skills', name);
  const files = readdirSync(directory, { recursive: true, withFileTypes: true })
    .filter(entry => entry.isFile())
    .map(entry => relative(directory, join(entry.parentPath ?? entry.path, entry.name)).replaceAll('\\', '/'))
    .filter(path => path !== 'SKILL.md').sort()
    .map(path => ({ path, content: readFileSync(join(directory, path), 'utf8') }));
  return { content: readFileSync(join(directory, 'SKILL.md'), 'utf8'), files };
}

/** A clean checkout plus a stateful platform double: no credentials, no network. */
export function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'multica-workspace-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  for (const dir of ['schemas', 'templates', 'roles', 'shared', 'skills']) cpSync(join(ROOT, dir), join(root, dir), { recursive: true });
  mkdirSync(join(root, 'migrations'));
  const binding = { workspace_id: id(1), human_user_id: id(3), owner_ids: [id(3)],
    identity: { workspace_name: 'Fixture', workspace_slug: 'fixture', human_name: 'miran' },
    agent_runtimes: Object.fromEntries(ROLES.map(role => [role, id(2)])),
    repository: 'https://github.com/example/multica-workspace' };
  const state = initialState();
  for (const [index, name] of catalogSkills(root).entries()) {
    const { content, files } = readSkill(root, name);
    state.skills.push({ id: id(1000 + index), name, content, files: files.map((file, position) => ({ id: id(2000 + index * 10 + position), ...file })) });
  }
  const runner = (...args) => structuredClone(command(state, ...args));
  return { root, binding, state, runner, stateDirectory: join(root, '.local/sync'),
    source: () => ({ revision: 'a'.repeat(40), tree: 'b'.repeat(40) }), log() {} };
}

export function apply(f, extra = {}) {
  return deploy(f.binding, true, { ...f, ...extra });
}

export const writes = state => state.calls.filter(call => call[1] === 'project' && call[2] === 'workflow' ? call[3] === 'set'
  : call[1] === 'workflow' && call[2] === 'handoff' ? true
  : !['get', 'list', 'runs'].includes(call[2]) && !(call[1] === 'workspace') && !(call[2] === 'member' && call[3] === 'list'));

export const seedImport = (f, name) => {
  const { content, files } = readSkill(f.root, name);
  f.state.importContent = { ...(f.state.importContent ?? {}), [name]: content };
  f.state.importFiles = { ...(f.state.importFiles ?? {}), [name]: files.map((file, index) => ({ id: id(5000 + index), ...file })) };
};
