import type { FullResult, Reporter, TestCase, TestResult } from '@playwright/test/reporter';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
const secrets = Object.entries(process.env).filter(([key, value]) => /PASSWORD|SECRET|TOKEN/.test(key) && value && value.length >= 8).map(([,value]) => value!);
function redact(value: string) {
  for (const secret of secrets) value = value.replaceAll(secret, '[REDACTED]');
  return value.replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[REDACTED-JWT]');
}
function escape(value: string) { return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;'); }
export default class SanitizedReporter implements Reporter {
  private tests: { title: string; status: string; expectedStatus: string; durationMs: number; errors: string[] }[] = [];
  onTestEnd(test: TestCase, result: TestResult) {
    this.tests.push({ title: test.titlePath().join(' > '), status: result.status, expectedStatus: test.expectedStatus, durationMs: result.duration, errors: result.errors.map(error => redact(error.message ?? 'Unknown error')) });
  }
  onEnd(result: FullResult) {
    mkdirSync('artifacts/playwright', { recursive: true });
    const playwrightVersion = JSON.parse(readFileSync('node_modules/@playwright/test/package.json', 'utf8')).version;
    const report = JSON.stringify({ status: result.status, target: process.env.E2E_BASE_URL, playwrightVersion, nodeVersion: process.version, utc: new Date().toISOString(), tests: this.tests }, null, 2);
    writeFileSync('artifacts/playwright/results.json', report);
    writeFileSync('artifacts/playwright/report.html', `<!doctype html><html lang="es"><meta charset="utf-8"><title>SIDNAM E2E</title><h1>SIDNAM Playwright</h1><pre>${escape(report)}</pre></html>`);
    const cases = this.tests.map(test => `<testcase name="${escape(test.title)}" time="${test.durationMs / 1000}">${test.status === test.expectedStatus ? '' : `<failure message="${escape(test.errors.join(' ').slice(0, 1000))}"/>`}</testcase>`).join('');
    writeFileSync('artifacts/playwright/junit.xml', `<?xml version="1.0" encoding="UTF-8"?><testsuite name="SIDNAM" tests="${this.tests.length}" failures="${this.tests.filter(test => test.status !== test.expectedStatus).length}">${cases}</testsuite>`);
  }
}
