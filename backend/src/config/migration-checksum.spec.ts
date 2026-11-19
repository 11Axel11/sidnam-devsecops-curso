import { migrationChecksums } from './migration-checksum';
describe('migration identity', () => {
  it('keeps identical SQL stable across Windows and Linux line endings', () => {
    expect(migrationChecksums('[\n {"query":"SELECT 1"}\n]').canonical).toBe(migrationChecksums('[\r\n {"query":"SELECT 1"}\r\n]').canonical);
  });
  it('rejects altered migration content', () => {
    expect(migrationChecksums('[{"query":"SELECT 1"}]').canonical).not.toBe(migrationChecksums('[{"query":"SELECT 2"}]').canonical);
  });
});
