import { JwtService } from '@nestjs/jwt';
import { configureSocketSecurity } from './socket-adapter';
import { setAuthCookies, clearAuthCookies, ACCESS_TOKEN_COOKIE } from '../modulos/autenticacion/auth-cookies';

describe('authentication boundary', () => {
  const previous = { ...process.env };
  afterEach(() => { process.env = { ...previous }; });
  it('sets host-only secure HttpOnly cookies and clears with matching scope', () => {
    process.env.NODE_ENV = 'production';
    const response = { cookie: jest.fn(), clearCookie: jest.fn() };
    setAuthCookies(response as any, 'test-access', 'test-refresh');
    clearAuthCookies(response as any);
    for (const [name, , options] of response.cookie.mock.calls) {
      expect(options).toMatchObject({ httpOnly: true, secure: true, sameSite: 'lax', path: '/' });
      expect(options).not.toHaveProperty('domain');
      expect(response.clearCookie).toHaveBeenCalledWith(name, expect.objectContaining({ httpOnly: true, secure: true, sameSite: 'lax', path: '/' }));
    }
  });
  it('rejects anonymous websocket connections', async () => {
    let middleware: any;
    configureSocketSecurity({ use: fn => { middleware = fn; } }, {} as any);
    const next = jest.fn();
    await middleware({ handshake: { headers: {} } }, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
  it('rejects refresh tokens and accounts without notification permissions', async () => {
    process.env.JWT_SECRET = 'test-only-'.repeat(5);
    const jwt = new JwtService({ secret: process.env.JWT_SECRET });
    const repo = { findOne: jest.fn().mockResolvedValue(null) };
    let middleware: any;
    configureSocketSecurity({ use: fn => { middleware = fn; } }, { getRepository: () => repo } as any);
    for (const type of ['refresh', 'access']) {
      const token = jwt.sign({ type, roleId: 1 });
      const next = jest.fn();
      await middleware({ handshake: { headers: { cookie: `${ACCESS_TOKEN_COOKIE}=${token}` } } }, next);
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    }
  });
});
