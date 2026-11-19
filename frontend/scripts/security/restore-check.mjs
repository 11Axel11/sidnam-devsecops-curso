import { resolve } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';
import { randomBytes, createHash } from 'node:crypto';
import { evidence, run, save, manifest } from './evidence.mjs';
const dir = evidence('restore-check');
const name = 'sidnam-restore-' + randomBytes(5).toString('hex');
const image = 'mysql:8.4@sha256:a81d043930e51745522bd5c430961cf8286f0a23f0a9a2a6e0108f7ea71b0902';
mkdirSync('.private', { recursive: true });
const envFile = resolve('.private', name + '.env');
writeFileSync(envFile, ['MYSQL_DATABASE=sidnam_staging_restore', 'MYSQL_USER=restore', 'MYSQL_PASSWORD=' + randomBytes(32).toString('hex'), 'MYSQL_ROOT_PASSWORD=' + randomBytes(32).toString('hex')].join('\n'), { mode: 0o600 });
const query = 'SELECT table_name FROM information_schema.tables WHERE table_schema=DATABASE() ORDER BY table_name;';
const sqlCommand = 'MYSQL_PWD="$MYSQL_PASSWORD" mysql -u "$MYSQL_USER" -B -N "$MYSQL_DATABASE"';
function checked(command, args, options) { const result = run(command, args, options); if (result.exitCode) throw new Error('Backup/restore operation failed'); return result.stdout; }
let status = 'FAIL';
try {
  const tables = checked('docker', ['exec', '-i', 'sidnam-devsecops-mysql-1', 'sh', '-c', sqlCommand], { input: query }).trim().split(/\r?\n/);
  if (tables.some(table => !/^[a-zA-Z0-9_]+$/.test(table))) throw new Error('Unexpected table name');
  const countsQuery = tables.map(table => `SELECT '${table}', COUNT(*) FROM \`${table}\``).join(' UNION ALL ') + ';';
  const before = checked('docker', ['exec', '-i', 'sidnam-devsecops-mysql-1', 'sh', '-c', sqlCommand], { input: countsQuery });
  const dump = checked('docker', ['exec', 'sidnam-devsecops-mysql-1', 'sh', '-c', 'MYSQL_PWD="$MYSQL_PASSWORD" mysqldump -u "$MYSQL_USER" --single-transaction --no-tablespaces "$MYSQL_DATABASE"']);
  const backupFile = resolve('.private', name + '.sql');
  writeFileSync(backupFile, dump, { mode: 0o600 });
  checked('docker', ['run', '-d', '--rm', '--name', name, '--network', 'none', '--memory=512m', '--env-file', envFile, image]);
  let ready = false;
  for (let i = 0; i < 90; i++) {
    const result = run('docker', ['exec', '-i', name, 'sh', '-c', sqlCommand], { input: 'SELECT 1;' });
    if (result.exitCode === 0) { ready = true; break; }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  if (!ready) throw new Error('Restore database startup timeout');
  checked('docker', ['exec', '-i', name, 'sh', '-c', sqlCommand], { input: dump });
  const after = checked('docker', ['exec', '-i', name, 'sh', '-c', sqlCommand], { input: countsQuery });
  if (before !== after) throw new Error('Restored row counts differ');
  save(dir, 'verification.json', { tableCount: tables.length, rowCounts: before.trim().split(/\r?\n/).map(line => { const [table, count] = line.split('\t'); return { table, count: Number(count) }; }), backupSha256: createHash('sha256').update(dump).digest('hex'), privateBackupPath: backupFile, isolatedNetwork: 'none' });
  status = 'PASS';
} catch (error) { save(dir, 'failure.json', { message: error.message }); process.exitCode = 1; }
finally { run('docker', ['stop', name]); manifest(dir, { status, scope: 'Local synthetic staging backup restored into independent disposable MySQL' }); console.log(dir); }
