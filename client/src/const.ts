export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

/**
 * Genera la URL de login de Google OAuth.
 * Apunta a /api/oauth/google en el mismo servidor.
 * El parámetro state se usa para redirigir al usuario de vuelta
 * a la página que intentaba visitar antes de hacer login.
 */
export const getLoginUrl = (returnPath?: string): string => {
  const state = returnPath || "/";
  const url = new URL("/api/oauth/google", window.location.origin);
  if (state !== "/") {
    url.searchParams.set("state", state);
  }
  return url.toString();
};
