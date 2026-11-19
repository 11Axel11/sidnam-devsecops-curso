import { readFileSync, existsSync } from 'node:fs';
import { evidence, save, manifest } from './evidence.mjs';
process.loadEnvFile('.env.coolify.local');
const endpoint = new URL(process.env.COOLIFY_URL);
if (endpoint.protocol !== 'https:' || endpoint.origin !== 'https://coolify.sidnam.org') throw new Error('Use the verified HTTPS Coolify panel');
if (!process.env.COOLIFY_TOKEN) throw new Error('Save a scoped Coolify API token in .env.coolify.local; never paste it into chat');
const token = process.env.COOLIFY_TOKEN;
async function api(path, method = 'GET', body) {
  const response = await fetch(new URL('/api/v1/' + path, endpoint), { method, headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined, redirect: 'error', signal: AbortSignal.timeout(30000) });
  if (!response.ok) {
    const detail = await response.json().catch(() => ({}));
    let errors = JSON.stringify(detail.errors ?? {});
    for (const [name, value] of Object.entries(process.env)) if (/PASS|SECRET|TOKEN/.test(name) && value && value.length > 7) errors = errors.replaceAll(value, '[REDACTED]');
    throw new Error(`Coolify request failed: ${response.status}; validation: ${errors}`);
  }
  return response.json();
}
const operation = process.argv[2] ?? 'inspect';
const dir = evidence('coolify');
try {
  if (operation === 'inspect') {
    const inventory = {};
    for (const type of ['projects', 'servers', 'services', 'applications']) {
      const entries = await api(type);
      inventory[type] = entries.map(entry => ({ uuid: entry.uuid, name: entry.name, status: entry.status, fqdn: entry.fqdn }));
    }
    save(dir, 'inventory.json', inventory);
    console.log(JSON.stringify(inventory, null, 2));
  } else if (operation === 'topology') {
    const servers = await api('servers');
    const topology = [];
    for (const entry of servers) {
      const server = await api('servers/' + entry.uuid);
      topology.push({ uuid: server.uuid, name: server.name, ip: server.ip, port: server.port, proxy: server.proxy?.type });
    }
    const production = await api('applications/hxfosmc0zcbu14cvweux0cwq');
    const frontend = await api('applications/h8rd46ue4c2owk19ozixswka');
    const summary = { servers: topology, backend: { repository: production.git_repository, branch: production.git_branch, commit: production.git_commit_sha, destinationId: production.destination_id, destinationKeys: Object.keys(production.destination ?? {}) }, source: { githubAppUuid: frontend.github_app?.uuid, githubAppId: frontend.github_app_id, sourceKeys: Object.keys(frontend).filter(key => /git|source|private_key/.test(key)), privateKeyId: frontend.private_key_id, privateKeyUuid: frontend.private_key?.uuid } };
    save(dir, 'topology.json', summary);
    console.log(JSON.stringify({ ...summary, sourceType: frontend.source_type, sourceId: frontend.source_id, gitRepository: frontend.git_repository, gitFullUrlIsConfigured: !!frontend.git_full_url }, null, 2));
    for (const category of ['github-apps']) {
      const records = await api(category);
      console.log(JSON.stringify({ category, records: records.map(record => ({ uuid: record.uuid, id: record.id, name: record.name })) }, null, 2));
    }
  } else if (operation === 'provision-project') {
    let project = (await api('projects')).find(entry => entry.name === 'SIDNAM DevSecOps');
    if (!project) project = await api('projects', 'POST', { name: 'SIDNAM DevSecOps' });
    const environments = await api('projects/' + project.uuid + '/environments');
    let environment = environments.find(entry => entry.name === 'staging');
    if (!environment) environment = await api('projects/' + project.uuid + '/environments', 'POST', { name: 'staging' });
    const configuration = { project_uuid: project.uuid, environment_uuid: environment.uuid, server_uuid: process.env.COOLIFY_SERVER_UUID };
    if (!configuration.server_uuid) throw new Error('Set COOLIFY_SERVER_UUID after inspecting topology');
    save('deploy/staging', 'coolify-target.json', configuration);
    save(dir, 'created-project.json', configuration);
    console.log(JSON.stringify(configuration, null, 2));
  } else if (operation === 'create-git-app') {
    const config = JSON.parse(readFileSync('deploy/staging/coolify-target.json', 'utf8'));
    let result = (await api('applications')).find(entry => entry.name === 'sidnam-devsecops-course');
    if (!result) result = await api('applications/private-github-app', 'POST', {
      project_uuid: config.project_uuid, environment_uuid: config.environment_uuid, server_uuid: config.server_uuid,
      github_app_uuid: 'jyznigx8myebr02w6fjspl2i', git_repository: 'KarinaMD16/sidnam-administrativa', git_branch: 'devsecops/curso-seguridad',
      name: 'sidnam-devsecops-course', build_pack: 'dockercompose', ports_exposes: '8080', base_directory: '/',
      docker_compose_location: '/deploy/staging/compose.coolify-build.yaml', instant_deploy: false, is_auto_deploy_enabled: false,
    });
    save('deploy/staging', 'coolify-target.json', { ...config, application_uuid: result.uuid, origin: 'https://sidnam-devsecops.187.124.88.238.sslip.io' });
    save(dir, 'created-application.json', { uuid: result.uuid });
    console.log('Created isolated Git application ' + result.uuid);
  } else if (operation === 'configure-git-app') {
    const config = JSON.parse(readFileSync('deploy/staging/coolify-target.json', 'utf8'));
    const app = await api('applications/' + config.application_uuid);
    if (app.name !== 'sidnam-devsecops-course') throw new Error('Wrong application');
    process.loadEnvFile('.env.vps.staging');
    const keys = ['APP_ORIGIN', 'DB_PASS', 'MYSQL_ROOT_PASSWORD', 'JWT_SECRET', 'JWT_VERIFICATION_TOKEN_SECRET', 'SWAGGER_PASSWORD', 'E2E_ADMIN_PASSWORD', 'E2E_READER_PASSWORD', 'E2E_INACTIVE_PASSWORD'];
    const data = keys.map(key => { if (!process.env[key]) throw new Error('Missing deployment variable ' + key); return { key, value: process.env[key], is_buildtime: false, is_runtime: true, is_preview: false }; });
    await api('applications/' + config.application_uuid + '/envs/bulk', 'PATCH', { data });
    await api('applications/' + config.application_uuid, 'PATCH', { docker_compose_location: '/deploy/staging/compose.coolify-build.yaml', is_auto_deploy_enabled: false });
    await api('applications/' + config.application_uuid, 'PATCH', { docker_compose_domains: [{ name: 'web', domain: config.origin + ':8080' }] });
    save(dir, 'configured.json', { uuid: config.application_uuid, keys, origin: config.origin });
    console.log('Configured isolated application and HTTPS web domain');
  } else if (operation === 'status-git-app') {
    const config = JSON.parse(readFileSync('deploy/staging/coolify-target.json', 'utf8'));
    const app = await api('applications/' + config.application_uuid);
    console.log(JSON.stringify({ uuid: app.uuid, name: app.name, status: app.status, domains: app.docker_compose_domains, repository: app.git_repository, branch: app.git_branch }, null, 2));
  } else if (operation === 'app-logs') {
    const config = JSON.parse(readFileSync('deploy/staging/coolify-target.json', 'utf8'));
    const service = process.argv[3];
    if (!['web', 'backend', 'backup', 'mysql'].includes(service)) throw new Error('Invalid staging service');
    process.loadEnvFile('.env.vps.staging');
    const response = await api('applications/' + config.application_uuid + '/logs?lines=30&service=' + service);
    let log = JSON.stringify(response);
    for (const [name, value] of Object.entries(process.env)) if (/PASS|SECRET|TOKEN/.test(name) && value && value.length > 7) log = log.replaceAll(value, '[REDACTED]');
    log = log.replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[REDACTED-JWT]');
    save(dir, 'service.log', log);
    console.log(log.slice(-4000));
  } else if (operation === 'deployment') {
    const id = process.argv[3];
    if (!/^[a-z0-9]+$/.test(id)) throw new Error('Invalid deployment');
    let deployment;
    try { deployment = await api('deployments/' + id); }
    catch {
      const config = JSON.parse(readFileSync('deploy/staging/coolify-target.json', 'utf8'));
      const history = await api('deployments/applications/' + config.application_uuid);
      const records = Array.isArray(history) ? history : (history.deployments ?? history.data ?? []);
      deployment = records.find(entry => entry.deployment_uuid === id);
      if (!deployment) throw new Error('Deployment not found in application history; keys: ' + Object.keys(history).join(','));
    }
    process.loadEnvFile('.env.vps.staging');
    let entries = deployment.logs;
    if (typeof entries === 'string') { try { entries = JSON.parse(entries); } catch {} }
    let log = Array.isArray(entries) ? entries.map(entry => entry.output ?? '').join('\n') : String(entries ?? '');
    for (const [name, value] of Object.entries(process.env)) if (/PASS|SECRET|TOKEN/.test(name) && value && value.length > 7) log = log.replaceAll(value, '[REDACTED]');
    log = log.replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[REDACTED-JWT]');
    save(dir, 'deployment.log', log);
    console.log(JSON.stringify({ status: deployment.status, commit: deployment.commit, logs: log.slice(-5000) }, null, 2));
  } else if (operation === 'deploy-git-app') {
    const config = JSON.parse(readFileSync('deploy/staging/coolify-target.json', 'utf8'));
    const app = await api('applications/' + config.application_uuid);
    if (app.name !== 'sidnam-devsecops-course') throw new Error('Wrong application');
    const result = await api('deploy?uuid=' + config.application_uuid + '&force=false');
    save(dir, 'deployment.json', result);
    console.log(JSON.stringify(result, null, 2));
  } else if (operation === 'create') {
    const config = JSON.parse(readFileSync('deploy/staging/coolify-target.json', 'utf8'));
    if (!config.project_uuid || !config.environment_uuid || !config.server_uuid) throw new Error('Inspect inventory and choose a dedicated staging target first');
    let result = (await api('services')).find(entry => entry.name === 'sidnam-devsecops-staging');
    if (!result) result = await api('services', 'POST', { project_uuid: config.project_uuid, environment_uuid: config.environment_uuid, server_uuid: config.server_uuid, name: 'sidnam-devsecops-staging', description: 'Isolated academic staging. Synthetic data only.', docker_compose_raw: readFileSync('deploy/staging/compose.coolify.yaml').toString('base64'), instant_deploy: false, force_domain_override: false });
    save('deploy/staging', 'coolify-target.json', { ...config, service_uuid: result.uuid });
    save(dir, 'created-service.json', { uuid: result.uuid, domains: result.domains });
    console.log('Created staging service: ' + result.uuid + '. Configure private environments and immutable release images before deploy.');
  } else if (operation === 'start') {
    const config = JSON.parse(readFileSync('deploy/staging/coolify-target.json', 'utf8'));
    if (!config.service_uuid || !/^[a-zA-Z0-9]+$/.test(config.service_uuid)) throw new Error('Explicit staging service_uuid required');
    const service = await api('services/' + config.service_uuid);
    if (service.name !== 'sidnam-devsecops-staging') throw new Error('Refusing to start an unrelated service');
    const result = await api('services/' + config.service_uuid + '/start');
    save(dir, 'deployment.json', { service: config.service_uuid, message: result.message ?? 'Start requested' });
  } else throw new Error('Expected inspect, create or start');
  manifest(dir, { status: 'SUCCESS', operation, endpoint: endpoint.origin });
} catch (error) {
  save(dir, 'failure.json', { message: error.message.replaceAll(token, '[REDACTED]') });
  manifest(dir, { status: 'FAIL', operation });
  throw new Error('Coolify operation failed; inspect sanitized evidence at ' + dir);
}
