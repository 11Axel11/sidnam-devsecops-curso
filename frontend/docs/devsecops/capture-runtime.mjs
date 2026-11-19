import { readFileSync } from 'node:fs';
import { evidence, save, manifest } from '../../scripts/security/evidence.mjs';
process.loadEnvFile('.env.coolify.local');
const endpoint = new URL(process.env.COOLIFY_URL);
if (endpoint.origin !== 'https://coolify.sidnam.org') throw new Error('Verified HTTPS panel required');
const config = JSON.parse(readFileSync('deploy/staging/coolify-target.json', 'utf8'));
async function api(path) {
  const response = await fetch(new URL('/api/v1/' + path, endpoint), { redirect: 'error', headers: { Authorization: 'Bearer ' + process.env.COOLIFY_TOKEN }, signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error('Runtime inspection failed');
  return response.json();
}
const app = await api('applications/' + config.application_uuid);
if (app.name !== 'sidnam-devsecops-course') throw new Error('Unrelated application');
const history = await api('deployments/applications/' + config.application_uuid);
const latest = (Array.isArray(history) ? history : history.deployments ?? history.data)[0];
if (latest.status !== 'finished') throw new Error('Deployment is not finished');
const checks = [];
for (let i = 0; i < 3; i++) {
  const response = await fetch(new URL('/api/health', config.origin), { signal: AbortSignal.timeout(15000), redirect: 'error' });
  const body = await response.json();
  if (!response.ok || body.environment !== 'staging') throw new Error('Public staging is not healthy');
  checks.push({ utc: new Date().toISOString(), status: response.status, body, headers: Object.fromEntries(['strict-transport-security', 'content-security-policy', 'x-content-type-options', 'x-frame-options', 'referrer-policy'].map(key => [key, response.headers.get(key)])) });
}
const logs = await api('applications/' + config.application_uuid + '/logs?lines=30&service=backup');
const backupObserved = JSON.stringify(logs).includes('Staging backup completed');
if (!backupObserved) throw new Error('Cannot confirm a successful backup log');
const dir = evidence('runtime');
save(dir, 'runtime.json', { target: config.origin, application: app.name, status: app.status, frontendCommit: latest.commit, deployment: latest.deployment_uuid, checks, backup: { successfulCompletionLogObserved: true, message: 'Staging backup completed', limitation: 'Coolify returns application logs; service filtering is not reliable in this version. This observation is not a remote restore test.' } });
manifest(dir, { status: 'PASS', target: config.origin, frontendCommit: latest.commit });
console.log(dir);
