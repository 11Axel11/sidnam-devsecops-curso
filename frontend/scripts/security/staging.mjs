import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { evidence, run, npm, save, manifest } from './evidence.mjs';
process.loadEnvFile('.env.staging');
const backend = resolve(process.env.BACKEND_DIR ?? '../../Backend/sidnam-backend');
process.env.BACKEND_DIR = backend;
const dir = evidence('integration');
const compose = ['compose', '--env-file', '.env.staging', '-f', 'deploy/staging/compose.yaml'];
if (process.env.LOCAL_TEST === 'true') compose.push('-f', 'deploy/staging/compose.local.yaml');
const results = {};
function step(name, command, args, options) {
  const result = run(command, args, options);
  results[name] = { exitCode: result.exitCode, error: result.error };
  // Logs can contain cookies/passwords on failed browser assertions: retain only exit codes here.
  console.log(name + ': ' + result.exitCode);
  if (result.exitCode) throw new Error(name + ' failed: ' + (result.error ?? result.stderr.slice(-300)));
  return result;
}
let status = 'FAIL';
try {
  step('mysql', 'docker', [...compose, 'up', '-d', '--wait', 'mysql']);
  if (!existsSync(resolve(backend, 'migrations/001-initial.json'))) {
    if (process.env.LOCAL_TEST !== 'true') throw new Error('Reviewed initial migration missing');
    step('migration-image', 'docker', [...compose, 'build', 'backend']);
    step('generate-initial-migration', 'docker', [...compose, 'run', '--rm', '--no-deps', '--user', 'root', '--volume', resolve(backend, 'migrations') + ':/app/migrations', 'backend', 'node', 'dist/devsecops/database.js', 'generate']);
  }
  step('build-images', 'docker', [...compose, 'build']);
  step('migrations', 'docker', [...compose, 'run', '--rm', '--no-deps', 'backend', 'node', 'dist/devsecops/database.js', 'migrate']);
  step('synthetic-seed', 'docker', [...compose, 'run', '--rm', '--no-deps', 'backend', 'node', 'dist/devsecops/database.js', 'seed']);
  step('deploy', 'docker', [...compose, 'up', '-d', '--wait']);
  const exported = step('openapi', 'docker', [...compose, 'exec', '-T', 'backend', 'node', '-e', "fetch('http://localhost:3000/docs-json',{headers:{Authorization:'Basic '+Buffer.from('admin:'+process.env.SWAGGER_PASSWORD).toString('base64')}}).then(async r=>{if(!r.ok)process.exit(1);console.log(await r.text())})"]);
  save(resolve('artifacts'), 'openapi.json', exported.stdout);
  process.env.E2E_BASE_URL = process.env.APP_ORIGIN;
  process.env.OPENAPI_FILE = resolve('artifacts/openapi.json');
  const tests = npm(['run', 'test:e2e', ...(process.env.LOCAL_TEST === 'true' ? ['--', '--project=chromium'] : [])]);
  results.playwright = { exitCode: tests.exitCode };
  let testLog = tests.stdout;
  for (const [key, value] of Object.entries(process.env)) if (/PASSWORD|SECRET|TOKEN/.test(key) && value && value.length >= 8) testLog = testLog.replaceAll(value, '[REDACTED]');
  save(dir, 'playwright-console.log', testLog.replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[REDACTED-JWT]'));
  const dast = npm(['run', 'security:dast']);
  results.dast = { exitCode: dast.exitCode };
  if (tests.exitCode || dast.exitCode) throw new Error('Dynamic verification failed; inspect sanitized artifacts');
  status = 'PASS';
} catch (error) {
  save(dir, 'failure.json', { message: error.message });
  console.error(error.message);
  process.exitCode = 1;
} finally {
  manifest(dir, { status, frontendCommit: run('git', ['rev-parse', 'HEAD']).stdout.trim(), backendCommit: run('git', ['rev-parse', 'HEAD'], { cwd: backend }).stdout.trim(), results });
  console.log(dir);
}
