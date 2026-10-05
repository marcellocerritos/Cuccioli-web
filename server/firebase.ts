import { env } from "cloudflare:workers";
type Value = { nullValue?: null; booleanValue?: boolean; integerValue?: string; doubleValue?: number; stringValue?: string; timestampValue?: string; arrayValue?: { values: Value[] }; mapValue?: { fields: Record<string, Value> } };
export function toFields(data: Record<string, unknown>): Record<string, Value> { return Object.fromEntries(Object.entries(data).filter(([,v])=>v!==undefined).map(([k,v]) => [k, toValue(v, k)])); }
function toValue(v: unknown, key = ""): Value {
  if (v === null) return { nullValue: null };
  if (typeof v === "boolean") return { booleanValue: v };
  if (typeof v === "number") return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === "string") return /^(createdAt|updatedAt|promotionEndDate)$/.test(key) ? { timestampValue: v } : { stringValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(x=>toValue(x)) } };
  return { mapValue: { fields: toFields(v as Record<string, Value>) } };
}
function fromValue(v: Value): unknown {
  if ("nullValue" in v) return null;
  if ("booleanValue" in v) return v.booleanValue;
  if ("integerValue" in v) return Number(v.integerValue);
  if ("doubleValue" in v) return v.doubleValue;
  if ("timestampValue" in v) return v.timestampValue;
  if (v.arrayValue) return (v.arrayValue.values || []).map(fromValue);
  if (v.mapValue) return fromFields(v.mapValue.fields || {});
  return v.stringValue || "";
}
export function fromFields(fields: Record<string, Value>) { return Object.fromEntries(Object.entries(fields).map(([k,v])=>[k,fromValue(v)])); }
const vars = () => env as unknown as Record<string, string>;
export function firebaseEnabled() {
  if (!vars().FIREBASE_PROJECT_ID) return false;
  if (!vars().FIREBASE_SERVICE_ACCOUNT_JSON || !vars().FIREBASE_API_KEY) throw new Error("La configuración de Firebase está incompleta.");
  return true;
}
export function publicFirebaseConfig() { return firebaseEnabled() ? { projectId: vars().FIREBASE_PROJECT_ID, apiKey: vars().FIREBASE_API_KEY, appId: vars().FIREBASE_APP_ID, storageBucket: vars().FIREBASE_STORAGE_BUCKET } : null; }
let tokenCache: { token: string; expires: number; email: string } | null = null;
const base64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/=/g, "").replace(/\+/g,"-").replace(/\//g,"_");
export async function googleToken() {
  const account = JSON.parse(vars().FIREBASE_SERVICE_ACCOUNT_JSON || "{}");
  if (account.project_id !== vars().FIREBASE_PROJECT_ID) throw new Error("La cuenta de servicio no corresponde al proyecto Firebase.");
  if (tokenCache && tokenCache.email === account.client_email && tokenCache.expires > Date.now() + 60000) return tokenCache.token;
  const enc = new TextEncoder(); const now = Math.floor(Date.now()/1000);
  const header = base64url(enc.encode(JSON.stringify({ alg: "RS256", typ: "JWT" })));
  const claims = base64url(enc.encode(JSON.stringify({ iss: account.client_email, scope: "https://www.googleapis.com/auth/datastore", aud: "https://oauth2.googleapis.com/token", iat: now, exp: now+3600 })));
  const pem = account.private_key.replace(/-----[^-]+-----|\s/g, "");
  const key = await crypto.subtle.importKey("pkcs8", Uint8Array.from(atob(pem), c=>c.charCodeAt(0)), { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const signature = base64url(new Uint8Array(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, enc.encode(`${header}.${claims}`))));
  const res = await fetch("https://oauth2.googleapis.com/token", { method: "POST", body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${header}.${claims}.${signature}` }) });
  if (!res.ok) throw new Error(`No fue posible autenticar Firebase (${res.status}).`);
  const data = await res.json() as { access_token: string; expires_in: number };
  tokenCache = { token: data.access_token, expires: Date.now()+data.expires_in*1000, email: account.client_email }; return data.access_token;
}
export const documentRoot = () => `projects/${vars().FIREBASE_PROJECT_ID}/databases/(default)/documents`;
export async function firestoreRequest(path: string, init?: RequestInit) {
  const res = await fetch(`https://firestore.googleapis.com/v1/${documentRoot()}${path}`, { ...init, headers: { Authorization: `Bearer ${await googleToken()}`, "Content-Type": "application/json", ...init?.headers } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Firebase rechazó la operación (${res.status}).`);
  return res.status === 204 ? {} : await res.json();
}
