import { resolve } from 'node:path';
import { npm, evidence, save, manifest, run } from './evidence.mjs';
process.loadEnvFile(process.env.STAGING_ENV_FILE ?? '.env.staging');
process.env.E2E_BASE_URL = process.env.APP_ORIGIN;
process.env.OPENAPI_FILE = resolve('artifacts/openapi.json');
const dir = evidence('dynamic');
const results = {};
for (const script of ['test:e2e', 'security:dast']) {
  const result = npm(['run', script, ...(script === 'test:e2e' && process.env.LOCAL_TEST === 'true' ? ['--', '--project=chromium'] : [])]);
  results[script] = { exitCode: result.exitCode, error: result.error };
  let log = result.stdout + '\n' + result.stderr;
  for (const [key, value] of Object.entries(process.env)) if (/PASSWORD|SECRET|TOKEN/.test(key) && value && value.length >= 8) log = log.replaceAll(value, '[REDACTED]');
  log = log.replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[REDACTED-JWT]');
  save(dir, script.replace(':', '-') + '.log', log);
  console.log(script + ': ' + result.exitCode);
}
const failed = Object.values(results).some(result => result.exitCode !== 0);
manifest(dir, { status: failed ? 'FAIL' : 'PASS', target: process.env.E2E_BASE_URL, frontendCommit: run('git', ['rev-parse', 'HEAD']).stdout.trim(), results });
console.log(dir);
process.exitCode = failed ? 1 : 0;
