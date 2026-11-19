export const LOGIN_PATH = "/login";

export const PUBLIC_PATHS = [
  LOGIN_PATH,
  "/reestablecer",
  "/forgotpassword",
  "/salidas",
  "/agregarproducto",
  "/403",
  "/404",
  "/500",
  "/offline",
];

export const isPublicPath = (pathname: string) => PUBLIC_PATHS.includes(pathname);
