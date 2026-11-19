// Run from frontend root. Only synthetic staging is accepted; no production writes.
import { randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { evidence, save, manifest } from '../../scripts/security/evidence.mjs';
process.loadEnvFile('.env.vps.staging');
process.loadEnvFile('.env.coolify.local');
if (new URL(process.env.COOLIFY_URL).origin !== 'https://coolify.sidnam.org') throw new Error('Verified panel required');
const config = JSON.parse(readFileSync('deploy/staging/coolify-target.json', 'utf8'));
const historyResponse = await fetch(new URL('/api/v1/deployments/applications/' + config.application_uuid, process.env.COOLIFY_URL), { headers: { Authorization: 'Bearer ' + process.env.COOLIFY_TOKEN }, redirect: 'error', signal: AbortSignal.timeout(15000) });
if (!historyResponse.ok) throw new Error('Cannot verify deployed revision');
const history = await historyResponse.json();
const latest = (Array.isArray(history) ? history : history.deployments ?? history.data)[0];
if (latest.status !== 'finished' || latest.commit !== process.env.DEPLOYED_FRONTEND_SHA) throw new Error('Wait for the expected deployment to finish before recording a checkpoint');
const point = process.argv[2];
if (!['before-rollback', 'after-rollback', 'after-restore', 'close'].includes(point)) throw new Error('Choose a documented rollout checkpoint');
const origin = process.env.APP_ORIGIN;
const health = await fetch(new URL('/api/health', origin), { signal: AbortSignal.timeout(15000) }).then(r => { if (!r.ok) throw new Error('Staging is not ready'); return r.json(); });
if (health.environment !== 'staging') throw new Error('Staging required');
const login = await fetch(new URL('/api/autenticacion/login', origin), { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ cedula: '900000001', password: process.env.E2E_ADMIN_PASSWORD }) });
if (!login.ok) throw new Error('Authentication failed');
const cookie = login.headers.getSetCookie().map(value => value.split(';')[0]).join('; ');
const request = (path, method = 'GET', body) => fetch(new URL(path, origin), { method, headers: { Origin: origin, Cookie: cookie, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
mkdirSync('.private', { recursive: true });
const file = '.private/rollout-marker.json';
let marker;
if (point === 'before-rollback' && !existsSync(file)) {
  const nombre = 'Rollout verification ' + randomUUID();
  const response = await request('/api/catalogos/antecedente-personal', 'POST', { nombre });
  if (response.status !== 201) throw new Error('Cannot create synthetic marker');
  const item = await response.json();
  marker = { id: item.id, nombre };
  writeFileSync(file, JSON.stringify(marker), { mode: 0o600 });
} else marker = JSON.parse(readFileSync(file, 'utf8'));
const response = await request('/api/catalogos/antecedente-personal?soloActivos=false');
if (!response.ok) throw new Error('Cannot read marker');
const matches = (await response.json()).filter(row => row.id === marker.id && row.nombre === marker.nombre);
if (matches.length !== 1) throw new Error('Marker lost or changed across release');
if (point === 'close') {
  const cleanup = await request('/api/catalogos/antecedente-personal/' + marker.id + '/desactivar', 'PATCH');
  if (!cleanup.ok) throw new Error('Marker cleanup failed');
}
const dir = evidence('rollout-check');
save(dir, 'verification.json', { point, origin, markerId: marker.id, persisted: true, frontendCommit: latest.commit, deployment: latest.deployment_uuid });
manifest(dir, { status: 'PASS', point });
console.log(dir);
