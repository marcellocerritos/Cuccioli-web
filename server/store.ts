import { env } from "cloudflare:workers";
import { defaultSettings, seedProducts } from "@/lib/catalog";
import { hashPassword } from "./security";
import { firebaseEnabled, firestoreRequest, documentRoot, toFields, fromFields } from "./firebase";
type RecordData = Record<string, unknown>;
const db = () => { if (!env.DB) throw new Error("El catálogo no está disponible en este momento."); return env.DB; };
export async function getRecord<T>(collection: string, id: string): Promise<T | null> {
  if (firebaseEnabled()) { const d = await firestoreRequest(`/${collection}/${encodeURIComponent(id)}`); return d ? fromFields(d.fields || {}) as T : null; }
  const r = await db().prepare("SELECT value FROM records WHERE collection = ? AND id = ?").bind(collection,id).first<{value:string}>(); return r ? JSON.parse(r.value) : null;
}
export async function listRecords<T>(collection: string): Promise<T[]> {
  if (firebaseEnabled()) {
    const rows: T[] = []; let token = "";
    do { const data = await firestoreRequest(`/${collection}?pageSize=300${token ? `&pageToken=${encodeURIComponent(token)}` : ""}`); rows.push(...(data?.documents || []).map((d: { fields: Parameters<typeof fromFields>[0] }) => fromFields(d.fields) as T)); token = data?.nextPageToken || ""; } while(token);
    return rows;
  }
  const r = await db().prepare("SELECT value FROM records WHERE collection = ?").bind(collection).all<{value:string}>(); return r.results.map(x => JSON.parse(x.value));
}
export async function putRecord(collection: string, id: string, value: RecordData) {
  if (firebaseEnabled()) { await firestoreRequest(`/${collection}/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify({ fields: toFields(value) }) }); return; }
  await db().prepare("INSERT INTO records(collection,id,value) VALUES (?,?,?) ON CONFLICT(collection,id) DO UPDATE SET value=excluded.value").bind(collection,id,JSON.stringify(value)).run();
}
export async function deleteRecord(collection: string, id: string) {
  if (firebaseEnabled()) { await firestoreRequest(`/${collection}/${encodeURIComponent(id)}`, { method: "DELETE" }); return; }
  await db().prepare("DELETE FROM records WHERE collection = ? AND id = ?").bind(collection,id).run();
}
export async function bootstrap() {
  if (await getRecord("private", "initialized")) return;
  if (firebaseEnabled() && env.DB) {
    const existing = await db().prepare("SELECT collection,id,value FROM records WHERE collection IN ('products','settings') OR (collection='private' AND id IN ('admin','initialized'))").all<{collection:string;id:string;value:string}>();
    const rows = existing.results;
    if (rows.some(r=>r.collection==='private' && r.id==='initialized')) {
      if (!rows.some(r=>r.collection==='private' && r.id==='admin') || !rows.some(r=>r.collection==='settings' && r.id==='main')) throw new Error("El catálogo de origen está incompleto.");
      if (rows.length>500) throw new Error("La migración requiere dividir el catálogo antes de activarlo.");
      try {
        await firestoreRequest(":commit", { method: "POST", body: JSON.stringify({ writes: rows.map(r=>({update:{name:`${documentRoot()}/${r.collection}/${r.id}`,fields:toFields(JSON.parse(r.value))},currentDocument:{exists:false}})) }) });
      } catch (error) {
        if (!await getRecord("private","initialized")) throw error;
      }
      return;
    }
  }
  const vars = env as unknown as Record<string,string>;
  if (!vars.CUCCIOLI_ADMIN_PASSWORD || vars.CUCCIOLI_ADMIN_PASSWORD === "CAMBIAR_ESTO" || vars.CUCCIOLI_ADMIN_PASSWORD.length < 8) throw new Error("Configurá una contraseña inicial privada antes de crear la base de datos.");
  const admin = { passwordHash: await hashPassword(vars.CUCCIOLI_ADMIN_PASSWORD), version: crypto.randomUUID() };
  const records: [string,string,RecordData][] = [
    ["settings", "main", { ...defaultSettings }], ["private", "admin", admin],
    ...seedProducts.map(p => ["products", p.id, { ...p }] as [string,string,RecordData]), ["private", "initialized", { done: true }],
  ];
  if (firebaseEnabled()) {
    await firestoreRequest(":commit", { method: "POST", body: JSON.stringify({ writes: records.map(([c,id,v])=>({ update: { name: `${documentRoot()}/${c}/${id}`, fields: toFields(v) }, currentDocument: { exists: false } })) }) });
  } else {
    await db().batch(records.map(([c,id,v]) => db().prepare("INSERT OR IGNORE INTO records(collection,id,value) SELECT ?,?,? WHERE NOT EXISTS (SELECT 1 FROM records WHERE collection='private' AND id='initialized')").bind(c,id,JSON.stringify(v))));
  }
}
