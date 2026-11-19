import 'dotenv/config';

export function validateEnvironment(env: NodeJS.ProcessEnv = process.env): void {
  for (const name of ['JWT_SECRET', 'JWT_VERIFICATION_TOKEN_SECRET']) {
    if (!env[name] || env[name]!.length < 32) throw new Error(`${name} must contain at least 32 characters`);
  }
  for (const name of ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASS', 'DB_NAME', 'APP_ORIGIN', 'SWAGGER_PASSWORD']) {
    if (!env[name]) throw new Error(`${name} is required`);
  }
  const origin = new URL(env.APP_ORIGIN!);
  if (origin.origin !== env.APP_ORIGIN) throw new Error('APP_ORIGIN must be an origin without a path or trailing slash');
  if (env.NODE_ENV === 'production' && origin.protocol !== 'https:') throw new Error('HTTPS required');
  if (env.SWAGGER_PASSWORD!.length < 16) throw new Error('SWAGGER_PASSWORD must contain at least 16 characters');
  if (env.APP_ENV === 'staging') {
    if (!env.DB_NAME?.startsWith('sidnam_staging')) throw new Error('Staging requires an isolated sidnam_staging database');
    if (env.EXTERNAL_SERVICES !== 'disabled') throw new Error('External services must be disabled in staging');
    if (env.DB_SYNCHRONIZE === 'true') throw new Error('Use migrations in staging');
    if (!env.AUTH_COOKIE_PREFIX || !/^[a-zA-Z0-9_]+$/.test(env.AUTH_COOKIE_PREFIX)) throw new Error('Staging requires a unique cookie prefix');
  }
}
export function allowedOrigins(): string[] { return process.env.APP_ORIGIN ? [process.env.APP_ORIGIN] : []; }
