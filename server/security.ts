const encoder = new TextEncoder();
export const hex = (b: ArrayBuffer | Uint8Array) => [...new Uint8Array(b)].map(v => v.toString(16).padStart(2, "0")).join("");
export async function digest(s: string) { return hex(await crypto.subtle.digest("SHA-256", encoder.encode(s))); }
export async function hashPassword(password: string, salt = hex(crypto.getRandomValues(new Uint8Array(24)))) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const derived = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: encoder.encode(salt), iterations: 100000, hash: "SHA-256" }, key, 256);
  return `${salt}:${hex(derived)}`;
}
export async function passwordMatches(password: string, stored: string) {
  if (!stored || !stored.includes(":")) return false;
  const result = await hashPassword(password, stored.split(":")[0]);
  let diff = result.length ^ stored.length;
  for (let i = 0; i < result.length; i++) diff |= result.charCodeAt(i) ^ (stored.charCodeAt(i) || 0);
  return diff === 0;
}
export class HttpError extends Error { constructor(public status: number, message: string) { super(message); } }
export function assertOrigin(req: Request, trustedOrigin = "") {
  const origin = req.headers.get("origin");
  if (trustedOrigin && origin === trustedOrigin) return;
  if (req.headers.get("sec-fetch-site") === "cross-site" || (origin && origin !== new URL(req.url).origin)) throw new HttpError(403, "Solicitud no permitida. Volvé a abrir el panel.");
}
export function sessionCookie(token: string, age = 28800) { return `cuccioli_session=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${age}`; }
export function readCookie(req: Request) { return req.headers.get("cookie")?.match(/(?:^|;\s*)cuccioli_session=([a-f0-9]{64})(?:;|$)/)?.[1] || ""; }
