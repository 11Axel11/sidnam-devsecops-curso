import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { evidence, run, npm, save, manifest } from './evidence.mjs';
const dir=evidence('security');
const refs=JSON.parse(readFileSync(new URL('./images.json',import.meta.url),'utf8'));
const outcomes={};
const staticOnly=process.argv.includes('--static');
const commit=run('git',['rev-parse','HEAD']);
const dirty=run('git',['status','--short']);
// Scan a Git-selected snapshot on the container's native filesystem. This avoids
// traversing node_modules and Windows bind-mount latency, while including new files.
const inputs=resolve('.private','scan-'+randomUUID());
mkdirSync(inputs,{recursive:true});
const selected=run('git',['ls-files','-z','--cached','--others','--exclude-standard']);
writeFileSync(resolve(inputs,'files.list'),selected.stdout);
const archive=run('tar',['-cf',resolve(inputs,'source.tar'),'--null','-T',resolve(inputs,'files.list')]);
const bundle=run('git',['bundle','create',resolve(inputs,'history.bundle'),'--all']);
if(selected.exitCode || archive.exitCode || bundle.exitCode) {
  save(dir,'snapshot-error.json',{selected,archive,bundle});
  manifest(dir,{status:'FAIL',reason:'Snapshot creation failed'});
  process.exit(1);
}
const sourceHash=createHash('sha256').update(readFileSync(resolve(inputs,'source.tar'))).digest('hex');
function capture(name,result,json=false) {
  save(dir,name+(json?'.json':'.log'),result.stdout || JSON.stringify({error:result.error,stderr:result.stderr}));
  outcomes[name]={exitCode:result.exitCode,error:result.error,stderr:result.stderr};
}
if(!staticOnly) {
  capture('npm-audit',npm(['audit','--json']),true);
  capture('npm-audit-production',npm(['audit','--omit=dev','--json']),true);
  capture('sbom',npm(['sbom','--sbom-format','cyclonedx']),true);
}
const docker=run('docker',['info','--format','{{.ServerVersion}}']);
const images={};
for(const [name,ref] of Object.entries(refs)) {
  if(name==='zap') continue;
  if(docker.exitCode) { outcomes[name]={exitCode:127,error:'Docker engine unavailable'}; continue; }
  const inspect=run('docker',['image','inspect','--format','{{index .RepoDigests 0}}',ref]);
  if(inspect.exitCode) { outcomes[name]={exitCode:127,error:'Image unavailable; pull '+ref}; continue; }
  images[name]=inspect.stdout.trim();
}
const mount=['run','--rm','--memory=768m','--cpus=1','-v',inputs+':/inputs:ro','--entrypoint','sh'];
if(images.semgrep) capture('semgrep',run('docker',[...mount,images.semgrep,'-c','mkdir -p /tmp/scan && tar -xf /inputs/source.tar -C /tmp/scan && cd /tmp/scan && exec semgrep scan --config security/vendor/ci.yml --config security/semgrep.yml --metrics=off --jobs=1 --no-git-ignore --severity ERROR --error --json .']),true);
if(images.gitleaks) {
  for(const mode of ['git','dir']) {
    const name='gitleaks-'+mode;
    const command=mode==='git'
      ? 'mkdir -p /tmp/scan && tar -xf /inputs/source.tar -C /tmp/scan && git clone --mirror /inputs/history.bundle /tmp/history.git >/dev/null 2>&1 && exec gitleaks git /tmp/history.git --config /tmp/scan/.gitleaks.toml --log-opts=--all --redact=100 --report-format=json --report-path=/reports/gitleaks-git.json'
      : 'mkdir -p /tmp/scan && tar -xf /inputs/source.tar -C /tmp/scan && exec gitleaks dir /tmp/scan --config /tmp/scan/.gitleaks.toml --redact=100 --report-format=json --report-path=/reports/gitleaks-dir.json';
    const result=run('docker',[...mount,'-v',dir+':/reports',images.gitleaks,'-c',command]);
    outcomes[name]={exitCode:result.exitCode,error:result.error,stderr:result.stderr};
    if(!existsSync(dir+'/'+name+'.json')) {
      save(dir,name+'.json',{error:'Scanner produced no report'});
      outcomes[name].exitCode=127;
    }
    if(mode==='git' && result.exitCode===1 && existsSync('security/revoked-secrets.json')) {
      const revoked=JSON.parse(readFileSync('security/revoked-secrets.json','utf8'));
      const report=JSON.parse(readFileSync(dir+'/'+name+'.json','utf8'));
      const allowed=new Set(revoked.filter(entry=>new Date(entry.reviewBy+'T23:59:59Z')>=new Date()).map(entry=>entry.fingerprint));
      if(Array.isArray(report) && report.length && report.every(entry=>allowed.has(entry.Fingerprint))) {
        outcomes[name]={...outcomes[name],rawExitCode:1,exitCode:0,revokedHistoricalFingerprints:report.map(entry=>entry.Fingerprint)};
      }
    }
  }
}
if(outcomes.semgrep) {
  try {
    const report=JSON.parse(readFileSync(dir+'/semgrep.json','utf8'));
    if(report.errors?.length || !Array.isArray(report.results)) outcomes.semgrep.exitCode=2;
  } catch { outcomes.semgrep.exitCode=2; }
}
let audit;
try { audit=JSON.parse(readFileSync(dir+'/npm-audit.json','utf8')); } catch {}
const scaBlocked=!staticOnly && (!audit?.metadata?.vulnerabilities || !!(audit.metadata.vulnerabilities.high+audit.metadata.vulnerabilities.critical));
const failed=scaBlocked || Object.entries(outcomes).some(([name,o])=>!name.startsWith('npm-audit') && o.exitCode!==0);
manifest(dir,{scope:staticOnly?'SAST and secrets only':'SAST, SCA, SBOM and secrets',sourceArchiveSha256:sourceHash,commit:commit.stdout.trim(),worktree:dirty.stdout,images,outcomes,scaBlocked,status:failed?'FAIL':'PASS',runUrl:process.env.GITHUB_SERVER_URL && process.env.GITHUB_SERVER_URL+'/'+process.env.GITHUB_REPOSITORY+'/actions/runs/'+process.env.GITHUB_RUN_ID});
console.log(JSON.stringify({directory:dir,status:failed?'FAIL':'PASS',outcomes:Object.fromEntries(Object.entries(outcomes).map(([k,v])=>[k,v.exitCode]))},null,2));
process.exitCode=failed?1:0;
