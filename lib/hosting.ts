// Only the Firebase static build defines this public backend URL.
declare const __CUCCIOLI_API_ORIGIN__: string;
export const apiOrigin = typeof __CUCCIOLI_API_ORIGIN__ === "string" ? __CUCCIOLI_API_ORIGIN__ : "";
export const apiUrl = (path: string) => `${apiOrigin}${path}`;
export const productImageUrl = (path: string) => path.startsWith("/api/images/") ? apiUrl(path) : path;
const sessionKey = "cuccioli_session";
let memorySession = "";
export function getSession() {
  try { return sessionStorage.getItem(sessionKey) || memorySession; } catch { return memorySession; }
}
export function setSession(token: string) {
  memorySession = token;
  try { if (token) sessionStorage.setItem(sessionKey, token); else sessionStorage.removeItem(sessionKey); } catch {}
}
