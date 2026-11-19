import { run, evidence, save, manifest } from './evidence.mjs';
import { readFileSync } from 'node:fs';
const targets = JSON.parse(readFileSync(new URL('../../security/repositories.json', import.meta.url), 'utf8'));
const names = { 'sidnam-administrativa': targets.frontend, 'sidnam-backend': targets.backend };
const owner = targets.owner;
if (!/^[a-zA-Z0-9-]+$/.test(owner) || Object.values(names).some(name => !/^[a-zA-Z0-9_.-]+$/.test(name))) throw new Error('Invalid repository configuration');
const credential = run('git', ['credential', 'fill'], { input: `protocol=https\nhost=github.com\npath=${owner}/${targets.frontend}.git\n\n`, env: { ...process.env, GIT_TERMINAL_PROMPT: '0', GCM_INTERACTIVE: 'Never' } });
const token = credential.stdout.split(/\r?\n/).find(line => line.startsWith('password='))?.slice(9);
if (!token) throw new Error('No delegated GitHub credential available; never paste credentials into chat');
async function api(path) {
  const response = await fetch('https://api.github.com/' + path, { headers: { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' }, redirect: 'error', signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`GitHub API status ${response.status}`);
  return response.json();
}
const dir = evidence('github');
try {
  if (process.argv[2] === 'joblog') {
    const repository = process.argv[3], id = process.argv[4];
    if (!['sidnam-administrativa', 'sidnam-backend'].includes(repository) || !/^\d+$/.test(id)) throw new Error('Invalid job');
    const response = await fetch('https://api.github.com/repos/' + owner + '/' + names[repository] + '/actions/jobs/' + id + '/logs', { headers: { Authorization: 'Bearer ' + token }, redirect: 'manual' });
    const redirect = response.headers.get('location');
    let log;
    if (redirect) {
      const url = new URL(redirect);
      if (url.protocol !== 'https:' || !/(^|\.)(githubusercontent\.com|blob\.core\.windows\.net|s3\.amazonaws\.com)$/.test(url.hostname)) throw new Error('Untrusted log host');
      log = await fetch(url).then(r => r.text());
    } else if (response.ok) log = await response.text();
    else throw new Error('Cannot fetch job log');
    log = log.replaceAll(token, '[REDACTED]').replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[REDACTED-JWT]');
    save(dir, 'job.log', log);
    manifest(dir, { status: 'SUCCESS', operation: 'joblog' });
    console.log(log.split('\n').slice(-70).join('\n'));
    process.exit(0);
  }
  if (process.argv[2] === 'runs') {
    for (const name of ['sidnam-administrativa', 'sidnam-backend']) {
      const response = await api('repos/' + owner + '/' + names[name] + '/actions/runs?branch=devsecops%2Fcurso-seguridad&per_page=6');
      const runs = response.workflow_runs.map(run => ({ id: run.id, workflow: run.name, sha: run.head_sha, status: run.status, conclusion: run.conclusion, url: run.html_url }));
      save(dir, name + '-runs.json', runs);
      console.log(JSON.stringify({ repository: owner + '/' + names[name], runs }, null, 2));
    }
    manifest(dir, { status: 'SUCCESS', operation: 'runs' });
    process.exit(0);
  }
  if (process.argv[2] === 'jobs') {
    const repository = process.argv[3], id = process.argv[4];
    if (!['sidnam-administrativa', 'sidnam-backend'].includes(repository) || !/^\d+$/.test(id)) throw new Error('Invalid workflow reference');
    const response = await api('repos/' + owner + '/' + names[repository] + '/actions/runs/' + id + '/jobs');
    const jobs = response.jobs.map(job => ({ id: job.id, name: job.name, status: job.status, conclusion: job.conclusion, steps: job.steps.map(step => ({ name: step.name, conclusion: step.conclusion })) }));
    save(dir, 'jobs.json', jobs);
    console.log(JSON.stringify(jobs, null, 2));
    manifest(dir, { status: 'SUCCESS', operation: 'jobs' });
    process.exit(0);
  }
  const repositories = [];
  for (const name of ['sidnam-administrativa', 'sidnam-backend']) {
    const repo = await api('repos/' + owner + '/' + names[name]);
    repositories.push({ name, private: repo.private, defaultBranch: repo.default_branch, permissions: repo.permissions });
  }
  save(dir, 'repository-access.json', repositories);
  manifest(dir, { status: 'SUCCESS', purpose: 'Read-only repository access inspection; credentials remain in process memory' });
  console.log(JSON.stringify(repositories, null, 2));
} catch (error) {
  save(dir, 'failure.json', { message: error.message.replaceAll(token, '[REDACTED]') });
  manifest(dir, { status: 'FAIL' });
  throw new Error('GitHub access inspection failed; see sanitized evidence');
}
