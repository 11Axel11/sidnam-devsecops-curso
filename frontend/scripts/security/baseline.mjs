import { resolve } from 'node:path';
import { evidence, run, npm, save, manifest } from './evidence.mjs';
const backend = resolve(process.env.BACKEND_DIR ?? '../../Backend/sidnam-backend');
const dir = evidence('baseline');
const repos = {};
let failed = false;
for (const [name, cwd] of [['frontend', process.cwd()], ['backend', backend]]) {
  const commit = run('git', ['rev-parse', 'HEAD'], { cwd });
  const status = run('git', ['status', '--short'], { cwd });
  const audit = npm(['audit', '--json'], cwd);
  save(dir, `${name}-audit.json`, audit.stdout || JSON.stringify(audit));
  repos[name] = { commit: commit.stdout.trim(), status: status.stdout, auditExitCode: audit.exitCode, auditError: audit.error ?? audit.stderr };
  if (commit.exitCode || audit.exitCode > 1 || !audit.stdout.includes('"metadata"')) failed = true;
}
manifest(dir, { purpose: 'Dependency snapshot; inspect worktree and capture time relative to remediation', status: failed ? 'ERROR' : 'CAPTURED', repos });
console.log(dir);
process.exitCode = failed ? 1 : 0;
