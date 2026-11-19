import { mkdirSync, writeFileSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve, relative, join } from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
export function run(command,args,options={}) { const r=spawnSync(command,args,{encoding:'utf8',maxBuffer:64*1024*1024,...options}); return {exitCode:r.status??127,stdout:r.stdout??'',stderr:r.stderr??'',error:r.error?.message}; }
export function npm(args,cwd) { if(!process.env.npm_execpath) throw new Error('Run through npm run'); return run(process.execPath,[process.env.npm_execpath,...args],{cwd}); }
export function evidence(label) { if(!/^[a-z0-9-]+$/i.test(label)) throw new Error('Invalid label'); const dir=resolve('artifacts',new Date().toISOString().replace(/[:.]/g,'-')+'-'+label); mkdirSync(dir,{recursive:true}); return dir; }
export function save(dir,name,value) { writeFileSync(join(dir,name),typeof value==='string'?value:JSON.stringify(value,null,2)); }
export function manifest(dir,metadata={}) { const files=[]; function visit(base) { for(const name of readdirSync(base)) { const p=join(base,name); if(statSync(p).isDirectory()) visit(p); else if(name!=='manifest.json') files.push({path:relative(dir,p).replaceAll('\\','/'),sha256:createHash('sha256').update(readFileSync(p)).digest('hex')}); } } visit(dir); save(dir,'manifest.json',{utc:new Date().toISOString(),costaRica:new Date().toLocaleString('es-CR',{timeZone:'America/Costa_Rica'}),node:process.version,...metadata,files}); }
