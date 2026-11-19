// Operator utility: deploy only the owned synthetic staging application.
import { readFileSync } from 'node:fs';
import { run, evidence, save, manifest } from '../../scripts/security/evidence.mjs';
process.loadEnvFile('.env.coolify.local');
const endpoint = new URL(process.env.COOLIFY_URL);
if (endpoint.origin !== 'https://coolify.sidnam.org') throw new Error('Verified HTTPS panel required');
const sha = process.argv[2];
if (!/^[a-f0-9]{40}$/.test(sha ?? '')) throw new Error('Supply a reviewed full frontend commit');
const ancestor = run('git', ['merge-base', '--is-ancestor', sha, 'origin/devsecops/curso-seguridad']);
if (ancestor.exitCode !== 0) throw new Error('Commit is not published on the academic branch');
const config = JSON.parse(readFileSync('deploy/staging/coolify-target.json', 'utf8'));
async function api(path, method = 'GET', body) {
  const response = await fetch(new URL('/api/v1/' + path, endpoint), {
    method, redirect: 'error', signal: AbortSignal.timeout(30000),
    headers: { Authorization: 'Bearer ' + process.env.COOLIFY_TOKEN, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) throw new Error('Coolify status ' + response.status);
  return response.json();
}
const app = await api('applications/' + config.application_uuid);
if (app.name !== 'sidnam-devsecops-course' || !/^(devsecops\/curso-seguridad|devsecops\/releases\/[a-f0-9]{40})$/.test(app.git_branch)) throw new Error('Unrelated application');
// This Coolify Compose version resolves branch HEAD even when git_commit_sha is
// set. An immutable release ref makes the requested source revision verifiable.
const releaseBranch = 'devsecops/releases/' + sha;
const pushed = run('git', ['push', 'origin', sha + ':refs/heads/' + releaseBranch]);
if (pushed.exitCode !== 0) throw new Error('Cannot publish reviewed release ref');
await api('applications/' + config.application_uuid, 'PATCH', { git_branch: releaseBranch, git_commit_sha: sha });
const queued = await api('deploy?uuid=' + config.application_uuid + '&force=false');
const dir = evidence('reviewed-release');
save(dir, 'release.json', { sha, releaseBranch, previousConfiguredSha: app.git_commit_sha, previousBranch: app.git_branch, target: config.origin, queued });
manifest(dir, { status: 'QUEUED', frontendCommit: sha });
console.log(JSON.stringify({ sha, ...queued }, null, 2));
