import { resolve } from 'node:path';
import { readFileSync, mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { run } from './evidence.mjs';
const metadata = JSON.parse(readFileSync('deploy/staging/backend-source.json', 'utf8'));
const archive = resolve('deploy/staging/backend-source.tar.gz');
if (createHash('sha256').update(readFileSync(archive)).digest('hex') !== metadata.sha256) throw new Error('Source archive hash mismatch');
const target = resolve(process.env.BACKEND_DIR ?? '../backend');
if (existsSync(target)) throw new Error('Extraction target must not exist');
mkdirSync(target, { recursive: true });
for (const result of [run('tar', ['-xzf', archive, '-C', target]), run('git', ['init'], { cwd: target }), run('git', ['add', '.'], { cwd: target }), run('git', ['-c', 'user.name=SIDNAM CI snapshot', '-c', 'user.email=ci@example.invalid', 'commit', '-m', 'Verified snapshot of backend ' + metadata.commit], { cwd: target })]) {
  if (result.exitCode) throw new Error('Cannot prepare verified backend snapshot');
}
console.log('Verified backend source ' + metadata.commit);
