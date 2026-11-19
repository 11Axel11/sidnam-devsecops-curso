import { validateEnvironment } from './security';
describe('deployment environment', () => {
  const valid = { NODE_ENV: 'production', APP_ENV: 'staging', JWT_SECRET: 'a'.repeat(40), JWT_VERIFICATION_TOKEN_SECRET: 'b'.repeat(40), DB_HOST: 'mysql', DB_PORT: '3306', DB_USER: 'staging', DB_PASS: 'c'.repeat(40), DB_NAME: 'sidnam_staging', APP_ORIGIN: 'https://staging.example.test', SWAGGER_PASSWORD: 'd'.repeat(32), EXTERNAL_SERVICES: 'disabled', AUTH_COOKIE_PREFIX: 'staging_' };
  it('accepts isolated HTTPS staging', () => expect(() => validateEnvironment(valid)).not.toThrow());
  it.each([{ JWT_SECRET: '' }, { APP_ORIGIN: 'http://staging.example.test' }, { DB_NAME: 'sidnam' }, { DB_SYNCHRONIZE: 'true' }, { EXTERNAL_SERVICES: 'enabled' }, { AUTH_COOKIE_PREFIX: '' }])('rejects unsafe configuration %j', change => expect(() => validateEnvironment({ ...valid, ...change })).toThrow());
});
