import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join, relative } from 'node:path';
import { createHash } from 'node:crypto';
import { isUtf8 } from 'node:buffer';
const extracted = resolve(process.env.BACKEND_DIR);
const source = resolve('backend');
let checked = 0;
function walk(base) {
  for (const name of readdirSync(base)) {
    if (name === '.git') continue;
    const file = join(base, name);
    if (statSync(file).isDirectory()) walk(file);
    else {
      const other = join(source, relative(extracted, file));
      const hash = p => {
        const bytes = readFileSync(p);
        const content = isUtf8(bytes) && !bytes.includes(0) ? bytes.toString('utf8').replaceAll('\r\n', '\n') : bytes;
        return createHash('sha256').update(content).digest('hex');
      };
      if (hash(file) !== hash(other)) throw new Error('Published backend differs from deployed bundle: ' + relative(extracted, file));
      checked++;
    }
  }
}
walk(extracted);
console.log('Verified ' + checked + ' published backend files against the deployment bundle; text CRLF normalized, binary bytes exact.');
