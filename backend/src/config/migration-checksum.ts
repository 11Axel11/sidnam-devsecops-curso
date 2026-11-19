import { createHash } from 'crypto';
export function migrationChecksums(content: string) {
  const digest = (value: string) => createHash('sha256').update(value).digest('hex');
  return { canonical: digest(JSON.stringify(JSON.parse(content))), legacy: [digest(content.replace(/\r\n/g, '\n')), digest(content.replace(/\r?\n/g, '\r\n'))] };
}
