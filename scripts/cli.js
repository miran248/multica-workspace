import { realpathSync, writeFileSync, renameSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export function saveManifest(path, config) {
  const temporary = `${path}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(config, null, 2)}\n`);
  renameSync(temporary, path);
}

export function entrypoint(url, main) {
  if (process.argv[1] && fileURLToPath(url) === realpathSync(process.argv[1])) {
    try { main(); } catch (error) {
      console.error(error.message);
      process.exitCode = Number.isInteger(error.status) && error.status > 0 ? error.status : 1;
    }
  }
}
