// Copies only explicitly selected, sanitized reports. No environments, SQL or logs.
import { readFileSync, writeFileSync, readdirSync, statSync, realpathSync, mkdirSync } from 'node:fs';
import { resolve, relative, join } from 'node:path';
import { createHash } from 'node:crypto';
import { evidence, manifest, run } from '../../scripts/security/evidence.mjs';
import { parseEnv } from 'node:util';
const privateEnvironments = ['.env.staging', '.env.vps.staging', '.env.coolify.local'].map(file => parseEnv(readFileSync(file, 'utf8')));
const selection = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const roots = [realpathSync('.'), realpathSync('../../Backend/sidnam-backend')];
const dir = evidence('delivery');
const secrets = [process.env, ...privateEnvironments].flatMap(env => Object.entries(env).filter(([key, value]) => /PASS|SECRET|TOKEN/.test(key) && value?.length >= 8).map(([, value]) => value));
for (const env of privateEnvironments) if (env.SWAGGER_PASSWORD) secrets.push(Buffer.from('admin:' + env.SWAGGER_PASSWORD).toString('base64'));
function copy(source, destination) {
  const actual = realpathSync(source);
  if (!roots.some(root => { const path = relative(root, actual); return path && !path.startsWith('..') && !path.includes(':'); })) throw new Error('Outside project roots');
  if (/(^|[\\/])(\.private|\.git|node_modules)([\\/]|$)|\.env|\.sql/i.test(actual)) throw new Error('Private source rejected');
  if (statSync(actual).isDirectory()) {
    for (const name of readdirSync(actual)) copy(join(actual, name), join(destination, name));
    return;
  }
  if (!/\.(json|html|xml|md)$/.test(actual)) return;
  let text = readFileSync(actual, 'utf8');
  for (const secret of secrets) text = text.replaceAll(secret, '[REDACTED]');
  text = text.replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[REDACTED-JWT]');
  mkdirSync(resolve(destination, '..'), { recursive: true });
  writeFileSync(destination, text);
}
for (const entry of selection.sources) {
  if (!/^[a-z0-9-]+$/.test(entry.label)) throw new Error('Invalid label');
  copy(resolve(entry.path), join(dir, entry.label));
}
writeFileSync(join(dir, 'delivery.json'), JSON.stringify({ ...selection, utc: new Date().toISOString(), note: 'Included source manifests describe original evidence. The root manifest hashes the sanitized delivery copies.' }, null, 2));
writeFileSync(join(dir, 'README.md'), '# SIDNAM: paquete de evidencias\n\nSitio: ' + selection.target + '\n\nAbrir [informe](documentation/REPORT.md), [estado verificado](documentation/STATUS.md) y [guion de defensa](documentation/DEMO.md).\n\n| Carpeta | Contenido |\n|---|---|\n' + selection.sources.map(entry => `| ${entry.label} | ${entry.purpose ?? entry.label} |`).join('\n') + '\n\nEl manifiesto raíz verifica las copias sanitizadas. Conservar este paquete privado; CI retiene sus artefactos 90 días.\n');
manifest(dir, { status: 'PACKAGED', frontendCommit: run('git', ['rev-parse', 'HEAD']).stdout.trim() });
// The generic report helper excludes manifest.json at every depth. A delivery
// must also protect its copied source manifests, excluding only its own root.
const deliveryManifestPath = join(dir, 'manifest.json');
const deliveryManifest = JSON.parse(readFileSync(deliveryManifestPath, 'utf8'));
deliveryManifest.files = [];
function hashCopies(base) {
  for (const name of readdirSync(base)) {
    const path = join(base, name);
    if (statSync(path).isDirectory()) hashCopies(path);
    else if (path !== deliveryManifestPath) deliveryManifest.files.push({ path: relative(dir, path).replaceAll('\\', '/'), sha256: createHash('sha256').update(readFileSync(path)).digest('hex') });
  }
}
hashCopies(dir);
writeFileSync(deliveryManifestPath, JSON.stringify(deliveryManifest, null, 2));
const archive = dir + '.tar.gz';
const result = run('tar', ['-czf', archive, '-C', dir, '.']);
if (result.exitCode !== 0) throw new Error('Archive failed');
const sha256 = createHash('sha256').update(readFileSync(archive)).digest('hex');
writeFileSync(archive + '.sha256', sha256 + '  ' + archive.split(/[\\/]/).pop() + '\n');
console.log(JSON.stringify({ directory: dir, archive, sha256 }, null, 2));
