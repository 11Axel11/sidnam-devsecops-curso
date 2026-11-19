import { CookieOptions, Response } from 'express';

export const ACCESS_TOKEN_COOKIE = `${process.env.AUTH_COOKIE_PREFIX ?? ''}access_token`;
export const REFRESH_TOKEN_COOKIE = `${process.env.AUTH_COOKIE_PREFIX ?? ''}refresh_token`;

const ACCESS_TOKEN_MAX_AGE = 15 * 60 * 1000;
const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

// Login, refresh y logout deben usar exactamente las mismas opciones;
// si difieren, el navegador guarda cookies duplicadas o las rechaza.
function baseCookieOptions(): CookieOptions {
  const isProd = process.env.NODE_ENV === 'production';

  return {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
  };
}

export function setAuthCookies(
  res: Response,
  accessToken: string,
  refreshToken: string,
) {
  const options = baseCookieOptions();

  res.cookie(ACCESS_TOKEN_COOKIE, accessToken, {
    ...options,
    maxAge: ACCESS_TOKEN_MAX_AGE,
  });

  res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, {
    ...options,
    maxAge: REFRESH_TOKEN_MAX_AGE,
  });
}

export function clearAuthCookies(res: Response) {
  const options = baseCookieOptions();

  res.clearCookie(ACCESS_TOKEN_COOKIE, options);
  res.clearCookie(REFRESH_TOKEN_COOKIE, options);
}
