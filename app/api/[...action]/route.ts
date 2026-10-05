import { env } from "cloudflare:workers";
import { bootstrap, getRecord, listRecords, putRecord, deleteRecord } from "@/server/store";
import { firebaseEnabled, publicFirebaseConfig, firestoreRequest, documentRoot } from "@/server/firebase";
import { digest, hashPassword, passwordMatches, HttpError, assertOrigin, sessionCookie, readCookie, hex } from "@/server/security";
import { productSchema, settingsSchema } from "@/server/validation";
import { getTaxonomy, saveTaxonomy, validateProductTaxonomy } from "@/server/taxonomy";
import { projectProduct, productVisible } from "@/lib/taxonomy";
import type { Product, Settings } from "@/lib/catalog";
export const dynamic = "force-dynamic";
type Admin = { passwordHash: string; version: string };
type Session = { expires: number; version: string };
const trustedOrigin = () => (env as unknown as Record<string,string>).CUCCIOLI_PUBLIC_ORIGIN || "";
const isExternalClient = (req:Request) => !!trustedOrigin() && req.headers.get("origin") === trustedOrigin();
function sessionToken(req:Request) {
  if(isExternalClient(req))return req.headers.get("authorization")?.match(/^Bearer ([a-f0-9]{64})$/)?.[1] || "";
  assertOrigin(req);
  return readCookie(req);
}
const json = (data: unknown, status = 200, extra: Record<string,string> = {}) => Response.json(data, { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", ...extra } });
async function body(req: Request) {
  if (!req.headers.get("content-type")?.includes("application/json")) throw new HttpError(415,"Formato de solicitud no válido.");
  if (Number(req.headers.get("content-length")) > 65536) throw new HttpError(413,"La información es demasiado grande.");
  const text = await req.text(); if (text.length>65536) throw new HttpError(413,"La información es demasiado grande.");
  try { return JSON.parse(text); } catch { throw new HttpError(400,"Revisá los datos del formulario."); }
}
async function requireAdmin(req: Request) {
  const token = sessionToken(req); if (!token) throw new HttpError(401,"Ingresá nuevamente para continuar.");
  const [session, admin] = await Promise.all([getRecord<Session>("sessions",await digest(token)),getRecord<Admin>("private","admin")]);
  if (!session || session.expires<Date.now() || session.version!==admin?.version) throw new HttpError(401,"Tu sesión venció. Ingresá nuevamente.");
  return admin;
}
async function loginRate(req: Request) {
  const key = await digest(`${req.headers.get("cf-connecting-ip") || "unknown"}:${Math.floor(Date.now()/900000)}`);
  let count: number;
  if (firebaseEnabled()) {
    const r = await firestoreRequest(":commit",{method:"POST",body:JSON.stringify({writes:[{transform:{document:`${documentRoot()}/loginAttempts/${key}`,fieldTransforms:[{fieldPath:"count",increment:{integerValue:"1"}}]}}]})});
    count=Number(r.writeResults?.[0]?.transformResults?.[0]?.integerValue || 99);
  } else {
    const r = await env.DB.prepare("INSERT INTO records(collection,id,value) VALUES ('loginAttempts',?,json_object('count',1)) ON CONFLICT(collection,id) DO UPDATE SET value=json_object('count',json_extract(records.value,'$.count')+1) RETURNING value").bind(key).first<{value:string}>();
    count=JSON.parse(r!.value).count;
  }
  if (count>10) throw new HttpError(429,"Demasiados intentos. Esperá 15 minutos antes de volver a ingresar.");
}
async function handle(req: Request) {
  const pathname = new URL(req.url).pathname.replace(/\/$/, "");
  if (!['GET','HEAD'].includes(req.method)) assertOrigin(req,trustedOrigin());
  if(req.method === "OPTIONS") {
    if(!isExternalClient(req))throw new HttpError(403,"Solicitud no permitida.");
    return new Response(null,{status:204});
  }
  if (pathname.startsWith("/api/images/") && req.method === "GET") {
    const key = pathname.split("/").pop()!;
    if (!/^[a-f0-9-]+\.(jpg|png|webp)$/.test(key)) throw new HttpError(404,"Imagen no encontrada.");
    const image = await env.BUCKET.get(`products/${key}`); if (!image) throw new HttpError(404,"Imagen no encontrada.");
    return new Response(image.body, { headers: { "Content-Type": image.httpMetadata?.contentType || "application/octet-stream", "Cache-Control": "public,max-age=31536000,immutable", "X-Content-Type-Options": "nosniff" } });
  }
  await bootstrap();
  if (pathname === "/api/catalog" && req.method === "GET") {
    const [products, settings, taxonomy] = await Promise.all([listRecords<Product>("products"),getRecord<Settings>("settings","main"),getTaxonomy()]);
    return json({ products: products.filter(p=>productVisible(p,taxonomy)).map(p=>projectProduct(p,taxonomy)).sort((a,b)=>a.order-b.order), settings, taxonomy, mode: firebaseEnabled()?"firebase":"preview", firebase:publicFirebaseConfig() });
  }
  if (pathname === "/api/admin/login" && req.method === "POST") {
    await loginRate(req); const data = await body(req);
    const admin = await getRecord<Admin>("private","admin");
    if (typeof data.password!=="string" || data.password.length>256 || !admin || !await passwordMatches(data.password,admin.passwordHash)) throw new HttpError(401,"La contraseña no es correcta. Intentá nuevamente.");
    const token = hex(crypto.getRandomValues(new Uint8Array(32)));
    await putRecord("sessions",await digest(token), { expires: Date.now()+28800000,version:admin.version });
    return isExternalClient(req)?json({ok:true,token}):json({ok:true},200,{"Set-Cookie":sessionCookie(token)});
  }
  if (pathname === "/api/admin/logout" && req.method === "POST") {
    const token = sessionToken(req); if(token) await deleteRecord("sessions",await digest(token));
    return json({ok:true},200,{"Set-Cookie":sessionCookie("",0)});
  }
  if (!pathname.startsWith("/api/admin/")) throw new HttpError(404,"No encontramos esta página.");
  const admin=await requireAdmin(req);
  if (pathname==="/api/admin/session" && req.method==="GET") return json({authenticated:true});
  if (pathname==="/api/admin/data" && req.method==="GET") {
    const [products,settings,taxonomy]=await Promise.all([listRecords<Product>("products"),getRecord<Settings>("settings","main"),getTaxonomy()]);
    return json({ products:products.map(p=>projectProduct(p,taxonomy)).sort((a,b)=>a.order-b.order), settings, taxonomy, mode:firebaseEnabled()?"firebase":"preview" });
  }
  if(pathname==="/api/admin/organizacion" && req.method==="POST")return json({taxonomy:await saveTaxonomy(await body(req))});
  if (pathname==="/api/admin/products" && (req.method==="POST" || req.method==="PUT")) {
    const input=await body(req); const result=productSchema.safeParse(input);
    if(!result.success) throw new HttpError(400,result.error.issues[0].message);
    const id=req.method==="POST" ? crypto.randomUUID() : input.id;
    if(typeof id!=="string" || !/^[a-z0-9-]{1,80}$/.test(id)) throw new HttpError(400,"Producto no válido.");
    const existing=req.method==="PUT" ? await getRecord<Product>("products",id) : null;
    if(req.method==="PUT"&&!existing) throw new HttpError(404,"Este producto ya no existe.");
    const product=validateProductTaxonomy({...result.data,id,createdAt:existing?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()},await getTaxonomy());
    await putRecord("products",id,product); return json({product});
  }
  if (pathname === "/api/admin/promotions" && req.method === "POST") {
    const input = await body(req);
    if (typeof input.id!=="string" || !/^[a-z0-9-]{1,80}$/.test(input.id) || typeof input.isOnPromotion!=="boolean" || !Array.isArray(input.prices) || input.prices.length>30) throw new HttpError(400,"Revisá la promoción.");
    const existing=await getRecord<Product>("products",input.id); if(!existing) throw new HttpError(404,"Este producto ya no existe.");
    const updated={...existing,isOnPromotion:input.isOnPromotion,variants:existing.variants.map(v=>({...v,promoPrice:input.prices.find((x:{id:string})=>x.id===v.id)?.promoPrice??v.promoPrice}))};
    const valid=productSchema.safeParse(updated);if(!valid.success)throw new HttpError(400,valid.error.issues[0].message);
    await putRecord("products",input.id,{...valid.data,id:existing.id,createdAt:existing.createdAt,updatedAt:new Date().toISOString()});return json({ok:true});
  }
  if (pathname.startsWith("/api/admin/products/") && req.method==="DELETE") {
    const id=pathname.split("/").pop()!; if(!/^[a-z0-9-]{1,80}$/.test(id)) throw new HttpError(400,"Producto no válido.");
    await deleteRecord("products",id); return json({ok:true});
  }
  if (pathname==="/api/admin/settings" && req.method==="PUT") {
    const input=await body(req); const result=settingsSchema.safeParse(input);
    if(!result.success) throw new HttpError(400,result.error.issues[0].message);
    await putRecord("settings","main",result.data);return json({settings:result.data});
  }
  if(pathname==="/api/admin/password" && req.method==="POST") {
    const data=await body(req);
    if(typeof data.currentPassword!=="string" || data.currentPassword.length>256 || !await passwordMatches(data.currentPassword,admin.passwordHash)) throw new HttpError(400,"La contraseña actual no es correcta.");
    if(typeof data.newPassword!=="string"||data.newPassword.length<8||data.newPassword.length>128) throw new HttpError(400,"Usá una contraseña de 8 a 128 caracteres.");
    if(data.newPassword!==data.confirmPassword) throw new HttpError(400,"Las contraseñas nuevas no coinciden.");
    await putRecord("private","admin",{passwordHash:await hashPassword(data.newPassword),version:crypto.randomUUID()});
    const token=sessionToken(req); if(token)await deleteRecord("sessions",await digest(token));
    return json({ok:true},200,{"Set-Cookie":sessionCookie("",0)});
  }
  if(pathname==="/api/admin/upload" && req.method==="POST") {
    if(Number(req.headers.get("content-length"))>5*1024*1024+65536) throw new HttpError(413,"La imagen debe pesar menos de 5 MB.");
    const form=await req.formData(); const file=form.get("image");
    if(!(file instanceof File)||!file.size||file.size>5*1024*1024) throw new HttpError(400,"Elegí una imagen JPG, PNG o WebP de hasta 5 MB.");
    const bytes=await file.arrayBuffer();const b=new Uint8Array(bytes);
    const format = b[0]===0xff&&b[1]===0xd8&&b[2]===0xff ? ["jpg","image/jpeg"] : b[0]===137&&b[1]===80&&b[2]===78&&b[3]===71 ? ["png","image/png"] : new TextDecoder().decode(b.slice(0,4))==="RIFF"&&new TextDecoder().decode(b.slice(8,12))==="WEBP" ? ["webp","image/webp"] : null;
    if(!format)throw new HttpError(400,"El archivo no es una imagen JPG, PNG o WebP válida.");
    const key=`${crypto.randomUUID()}.${format[0]}`;let imageUrl:string;
    await env.BUCKET.put(`products/${key}`,bytes,{httpMetadata:{contentType:format[1]}});imageUrl=`/api/images/${key}`;
    return json({imageUrl});
  }
  throw new HttpError(404,"No encontramos esta opción.");
}
async function route(req:Request) {
  let response:Response;
  try { response=await handle(req); } catch(e) {
    if(e instanceof HttpError)response=json({error:e.message},e.status);
    else { console.error("Cuccioli request failed",e instanceof Error ? e.message : "unknown");response=json({error:req.method==="GET"?"No pudimos cargar la información. Intentá nuevamente.":"No pudimos completar la solicitud. Tus cambios no se han guardado. Intentá nuevamente."},503); }
  }
  response.headers.append("Vary","Origin");
  if(isExternalClient(req)) {
    response.headers.set("Access-Control-Allow-Origin",trustedOrigin());
    response.headers.set("Access-Control-Allow-Methods","GET, POST, PUT, DELETE, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers","Content-Type, Authorization");
    response.headers.set("Access-Control-Max-Age","600");
    response.headers.delete("Set-Cookie");
  }
  return response;
}
export const GET=route;export const POST=route;export const PUT=route;export const DELETE=route;export const OPTIONS=route;
