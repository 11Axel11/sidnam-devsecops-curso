import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { evidence, run, save, manifest } from './evidence.mjs';
import { verifyStatefulAlerts } from './stateful-triage.mjs';

const origin = process.env.E2E_BASE_URL;
if (!origin) throw new Error('E2E_BASE_URL required');
const target = new URL(origin);
if (/^(www\.)?sidnam\.org$|^api\.sidnam\.org$/.test(target.hostname)) throw new Error('Production forbidden');
const health = await fetch(new URL('/api/health', origin)).then(r => r.json());
if (health.environment !== 'staging') throw new Error('Verified staging required');
const local = ['localhost', '127.0.0.1'].includes(target.hostname);
const zapTarget = new URL(origin);
// Linux loopback-published ports cannot be reached through host-gateway.
// Join the frontend edge network and keep the real Origin for CSRF checks.
const composeNetwork = local && process.platform === 'linux';
if (local) zapTarget.hostname = composeNetwork ? 'web' : 'host.docker.internal';
if (composeNetwork) zapTarget.port = '8080';
const scope = zapTarget.origin;
const dir = evidence('dast');
const key = randomBytes(32).toString('hex');
const name = 'sidnam-zap-' + randomBytes(6).toString('hex');
const port = Number(process.env.ZAP_PORT ?? 8090);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid ZAP port');
const imageRef = JSON.parse(readFileSync(new URL('./images.json', import.meta.url), 'utf8')).zap;
const inspected = run('docker', ['image', 'inspect', '--format', '{{index .RepoDigests 0}}', imageRef]);
if (inspected.exitCode) throw new Error('Pull ZAP image first');
const image = inspected.stdout.trim();
const secrets = [key, process.env.E2E_ADMIN_PASSWORD].filter(Boolean);
function clean(text) {
  for (const value of secrets) text = text.replaceAll(value, '[REDACTED]');
  return text.replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[REDACTED-JWT]');
}
const started = run('docker', ['run', '-d', '--rm', '--name', name, '--memory=1g', '--cpus=1', '--no-healthcheck', ...(composeNetwork ? ['--network', 'sidnam-devsecops_edge'] : []), '-p', `127.0.0.1:${port}:${port}`, '--add-host', 'host.docker.internal:host-gateway', image, 'zap.sh', '-daemon', '-host', '0.0.0.0', '-port', String(port), '-config', `api.key=${key}`, '-config', 'api.addrs.addr.name=.*', '-config', 'api.addrs.addr.regex=true', '-config', 'autoupdate.checkOnStart=false', '-config', 'autoupdate.downloadNewRelease=false', '-config', 'autoupdate.installAddonUpdates=false']);
if (started.exitCode) {
  save(dir, 'failure.json', { message: clean(started.stderr), exitCode: started.exitCode });
  manifest(dir, { status: 'FAIL', phase: 'ZAP startup' });
  run('docker', ['rm', name]);
  throw new Error('Cannot start isolated ZAP; see ' + dir);
}
async function api(component, action, params = {}, type = 'action') {
  const url = new URL(`http://127.0.0.1:${port}/JSON/${component}/${type}/${action}/`);
  url.search = new URLSearchParams({ apikey: key, ...params });
  const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
  const value = await response.json();
  if (!response.ok || value.code) throw new Error(`ZAP ${component}/${action} failed: HTTP ${response.status}, ${value.code ?? 'unknown'}`);
  return value;
}
async function poll(component, scanId, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const value = await api(component, 'status', { scanId }, 'view');
    if (value.status === '100') return;
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  throw new Error(`ZAP ${component} timeout; incomplete coverage`);
}
let status = 'FAIL';
try {
  let ready = false;
  let startupError = '';
  for (let attempt = 0; attempt < 180; attempt++) {
    try { await api('core', 'version', {}, 'view'); ready = true; break; } catch (error) { startupError = error.message; await new Promise(resolve => setTimeout(resolve, 1000)); }
  }
  if (!ready) throw new Error('ZAP startup timeout: ' + startupError);
  const login = await fetch(new URL('/api/autenticacion/login', origin), { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin }, body: JSON.stringify({ cedula: '900000001', password: process.env.E2E_ADMIN_PASSWORD }) });
  if (!login.ok) throw new Error('DAST authentication failed');
  const cookies = login.headers.getSetCookie().map(value => value.split(';')[0]).join('; ');
  if (!cookies) throw new Error('No authenticated cookies');
  secrets.push(cookies);
  const session = await login.json();
  if (session.accessToken) secrets.push(session.accessToken);
  const pattern = '^' + scope.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '/.*$';
  const context = await api('context', 'newContext', { contextName: name });
  await api('context', 'includeInContext', { contextName: name, regex: pattern });
  await api('context', 'setContextInScope', { contextName: name, booleanInScope: 'true' });
  await api('replacer', 'addRule', { description: 'staging-auth-cookie', enabled: 'true', matchType: 'REQ_HEADER', matchRegex: 'false', matchString: 'Cookie', replacement: cookies, url: pattern });
  await api('replacer', 'addRule', { description: 'staging-origin', enabled: 'true', matchType: 'REQ_HEADER', matchRegex: 'false', matchString: 'Origin', replacement: origin, url: pattern });
  const proof = await api('core', 'sendRequest', { request: `GET ${scope}/api/autenticacion/me HTTP/1.1\r\nHost: ${zapTarget.host}\r\n\r\n`, followRedirects: 'false' });
  if (!JSON.stringify(proof).match(/HTTP\/1\.[01] 200/)) throw new Error('ZAP cannot access protected resource');
  save(dir, 'authenticated-coverage.json', { endpoint: '/api/autenticacion/me', status: 200, target: scope });
  const spec = !local && process.env.SWAGGER_PASSWORD
    ? await fetch(new URL('/docs-json', origin), { headers: { Authorization: 'Basic ' + Buffer.from('admin:' + process.env.SWAGGER_PASSWORD).toString('base64') } }).then(async response => { if (!response.ok) throw new Error('Protected deployed OpenAPI export failed'); return response.json(); })
    : JSON.parse(readFileSync(process.env.OPENAPI_FILE ?? 'artifacts/openapi.json', 'utf8'));
  spec.servers = [{ url: scope }];
  spec.paths = Object.fromEntries(Object.entries(spec.paths).filter(([path]) => path.startsWith('/api/catalogos/') || path === '/api/autenticacion/me'));
  if (!Object.keys(spec.paths).length) throw new Error('OpenAPI has no scoped paths');
  save(dir, 'openapi.json', spec);
  const copied = run('docker', ['cp', dir + '/openapi.json', name + ':/tmp/openapi.json']);
  if (copied.exitCode) throw new Error('OpenAPI copy failed');
  await api('openapi', 'importFile', { file: '/tmp/openapi.json', target: scope, contextId: context.contextId });
  const spider = await api('spider', 'scan', { url: scope + '/', contextName: name, recurse: 'true', subtreeOnly: 'true' });
  await poll('spider', spider.scan, 120000);
  const passiveDeadline = Date.now() + 120000;
  while (Number((await api('pscan', 'recordsToScan', {}, 'view')).recordsToScan) > 0) {
    if (Date.now() > passiveDeadline) throw new Error('Passive scan incomplete');
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  save(dir, 'baseline.json', clean(JSON.stringify(await api('core', 'alerts', { baseurl: scope }, 'view'), null, 2)));
  await api('ascan', 'setOptionThreadPerHost', { Integer: '1' });
  await api('ascan', 'setOptionMaxScanDurationInMins', { Integer: '5' });
  const active = await api('ascan', 'scan', { url: scope + '/', recurse: 'true', inScopeOnly: 'true', contextId: context.contextId });
  await poll('ascan', active.scan, 360000);
  const alerts = await api('core', 'alerts', { baseurl: scope }, 'view');
  save(dir, 'alerts.json', clean(JSON.stringify(alerts, null, 2)));
  const urls = await api('core', 'urls', { baseurl: scope }, 'view');
  save(dir, 'coverage.json', clean(JSON.stringify(urls, null, 2)));
  const report = await fetch(`http://127.0.0.1:${port}/OTHER/core/other/htmlreport/?apikey=${key}`).then(r => r.text());
  save(dir, 'report.html', clean(report));
  const riskLevels = { Informational: 0, Low: 1, Medium: 2, High: 3, Critical: 4 };
  const risks = alerts.alerts.map(alert => alert.riskcode !== undefined ? Number(alert.riskcode) : riskLevels[alert.risk]);
  if (risks.some(risk => !Number.isFinite(risk))) throw new Error('Unknown alert severity; review report');
  const triage = await verifyStatefulAlerts(origin, cookies, alerts.alerts);
  save(dir, 'stateful-triage.json', triage);
  const accepted = new Set(triage.acceptedAlertIds);
  if (alerts.alerts.some((alert, index) => risks[index] >= 3 && !accepted.has(alert.id))) throw new Error('Unresolved high or critical DAST alerts require review');
  status = 'PASS';
} catch (error) {
  save(dir, 'failure.json', { message: clean(error.message) });
  console.error(clean(error.message));
  process.exitCode = 1;
} finally {
  const daemon = run('docker', ['logs', '--tail', '100', name]);
  save(dir, 'daemon.log', clean(daemon.stdout + '\n' + daemon.stderr));
  run('docker', ['stop', name]);
  manifest(dir, { status, target: scope, image, maxActiveMinutes: 5, note: 'SPA authenticated UI exercised by Playwright; DAST covers discovered URLs and scoped OpenAPI. Time-limited active coverage is not exhaustive.' });
  console.log(dir);
}
