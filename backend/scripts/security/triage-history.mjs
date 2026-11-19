import { readFileSync, readdirSync } from 'node:fs';
import { run, evidence, save, manifest } from './evidence.mjs';
const runs = readdirSync('artifacts').filter(name => name.endsWith('-security')).sort();
const findings = JSON.parse(readFileSync(`artifacts/${runs.at(-1)}/gitleaks-git.json`, 'utf8'));
const local = readFileSync('.env', 'utf8');
const summary = findings.map(finding => {
  const original = run('git', ['show', finding.Commit + ':' + finding.File]);
  const line = original.stdout.split(/\r?\n/)[finding.StartLine - 1] ?? '';
  const value = line.match(/(?:secret|key|token)\s*["']?\s*[:=]\s*["']?([\w-]{16,})/i)?.[1];
  return { fingerprint: finding.Fingerprint, file: finding.File, line: finding.StartLine, keyIndicators: ['JWT_SECRET', 'JWT_VERIFICATION_TOKEN_SECRET', 'RESEND_API_KEY', 'API_KEY', 'PASSWORD'].filter(key => line.includes(key)), placeholderHint: /your_|tu_|example|changeme|replace|aqui|ejemplo/i.test(line), matchesLocalEnvironment: !!value && local.includes(value), status: 'Needs owner verification; no live credential testing performed' };
});
const dir = evidence('secret-triage');
save(dir, 'summary.json', summary);
manifest(dir, { status: 'REVIEW_REQUIRED', note: 'No secret values or prefixes saved' });
console.log(JSON.stringify(summary, null, 2));
