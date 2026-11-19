import { mkdirSync, writeFileSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve, relative, join } from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

export function run(command, args, options = {}) {
  const result = spawnSync(command, args, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, ...options });
  return { exitCode: result.status ?? 127, stdout: result.stdout ?? '', stderr: result.stderr ?? '', error: result.error?.message };
}
export function npm(args, cwd) {
  // Invoke npm's JS entry point directly, without interpolating arguments into a shell.
  const cli = process.env.npm_execpath;
  if (!cli) throw new Error('Run this script through npm run.');
  return run(process.execPath, [cli, ...args], { cwd });
}
export function evidence(label) {
  if (!/^[a-z0-9-]+$/i.test(label)) throw new Error('Invalid evidence label');
  const dir = resolve('artifacts', `${new Date().toISOString().replace(/[:.]/g, '-')}-${label}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}
export function save(dir, name, value) {
  writeFileSync(join(dir, name), typeof value === 'string' ? value : JSON.stringify(value, null, 2));
}
export function manifest(dir, metadata = {}) {
  const files = [];
  function visit(base) {
    for (const name of readdirSync(base)) {
      const path = join(base, name);
      if (statSync(path).isDirectory()) visit(path);
      else if (name !== 'manifest.json') files.push({ path: relative(dir, path).replaceAll('\\', '/'), sha256: createHash('sha256').update(readFileSync(path)).digest('hex') });
    }
  }
  visit(dir);
  save(dir, 'manifest.json', { utc: new Date().toISOString(), costaRica: new Date().toLocaleString('es-CR', { timeZone: 'America/Costa_Rica' }), node: process.version, ...metadata, files });
}
