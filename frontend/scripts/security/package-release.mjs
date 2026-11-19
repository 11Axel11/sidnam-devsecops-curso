import { resolve } from 'node:path';
import { mkdirSync, copyFileSync } from 'node:fs';
import { run, evidence, manifest, save } from './evidence.mjs';
const backend = resolve(process.env.BACKEND_DIR ?? '../../Backend/sidnam-backend');
const refs = [['frontend', process.cwd()], ['backend', backend]].map(([name, cwd]) => {
  const commit = run('git', ['rev-parse', 'HEAD'], { cwd });
  const dirty = run('git', ['status', '--porcelain'], { cwd });
  if (commit.exitCode || dirty.exitCode || dirty.stdout) throw new Error('Commit reviewed changes before packaging release');
  return { name, cwd, sha: commit.stdout.trim() };
});
const release = refs.map(ref => ref.sha.slice(0, 12)).join('-');
const dir = evidence('release');
for (const ref of refs) {
  const image = `sidnam-${ref.name}:${release}`;
  const built = run('docker', ['build', '-t', image, ref.cwd]);
  if (built.exitCode) throw new Error(`${ref.name} image build failed`);
  const archived = run('git', ['archive', '--format=tar', '-o', resolve(dir, ref.name + '.tar'), ref.sha], { cwd: ref.cwd });
  if (archived.exitCode) throw new Error('Source archive failed');
}
const saved = run('docker', ['save', '-o', resolve(dir, 'images.tar'), `sidnam-frontend:${release}`, `sidnam-backend:${release}`]);
if (saved.exitCode) throw new Error('Image export failed');
copyFileSync('deploy/staging/release.sh', resolve(dir, 'release.sh'));
save(dir, 'release.json', { release, refs: refs.map(({name,sha})=>({name,sha})) });
manifest(dir, { release, note: 'Packaging is not deployment approval or proof of successful dynamic verification.' });
console.log(dir);
