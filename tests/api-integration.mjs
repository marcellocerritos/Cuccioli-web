import assert from "node:assert/strict";
import { readFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { DatabaseSync } from "node:sqlite";

const root=fileURLToPath(new URL("..",import.meta.url));
const temp=await mkdtemp(path.join(tmpdir(),"cuccioli-test-"));
let mf;
try {
  const pure=await build({stdin:{contents:'export * from "./lib/catalog.ts"; export * from "./server/validation.ts";',resolveDir:root},bundle:true,write:false,format:"esm",platform:"node",alias:{"@":root}});
  const {seedProducts,categories,promotionActive,variantPrice,whatsappUrl,productSchema}=await import(`data:text/javascript;base64,${Buffer.from(pure.outputFiles[0].text).toString("base64")}`);
  assert.equal(seedProducts.length,37);
  assert.ok(seedProducts.every(p=>p.variants.every(v=>v.price===0&&v.promoPrice===0)));
  for(const c of categories)for(const brand of c.brands)assert.ok(seedProducts.some(p=>p.petType===c.type&&p.brand===brand),`${c.type}: ${brand}`);
  const sample={...seedProducts[0],isOnPromotion:true,promotionEndDate:"2099-01-01T00:00:00.000Z",variants:[{id:"a",size:"3 kg",price:40,promoPrice:30,active:true}]};
  assert.equal(variantPrice(sample,sample.variants[0]),30);
  const expired={...sample,promotionEndDate:"2000-01-01T00:00:00.000Z"};
  assert.equal(promotionActive(expired),false);assert.equal(variantPrice(expired,expired.variants[0]),40);
  const link=whatsappUrl("50371234567",sample,sample.variants[0]);
  assert.match(new URL(link).searchParams.get("text"),/3 kg a \$30\.00/);
  assert.doesNotMatch(new URL(whatsappUrl("50371234567",seedProducts[0],seedProducts[0].variants[0])).searchParams.get("text"),/\$0/);
  assert.equal(whatsappUrl("50300000000"),null);
  assert.equal(productSchema.safeParse({...sample,variants:[{...sample.variants[0],promoPrice:45}]}).success,false);
  assert.equal(productSchema.safeParse({...sample,variants:[{...sample.variants[0],active:false}]}).success,false);
  console.log("PASS · 37 semillas, marcas, precios, promociones y mensajes de WhatsApp");

  const worker=await build({stdin:{contents:'import {GET,POST,PUT,DELETE,OPTIONS} from "./app/api/[...action]/route.ts"; export default {fetch(req){return ({GET,POST,PUT,DELETE,OPTIONS})[req.method](req);}};',resolveDir:root},bundle:true,write:false,format:"esm",platform:"browser",target:"es2022",plugins:[{name:"test-bindings",setup(b){b.onResolve({filter:/^cloudflare:workers$/},()=>({path:"bindings",namespace:"test"}));b.onLoad({filter:/.*/,namespace:"test"},()=>({contents:"export const env=globalThis.__cuccioliTestEnv;",loader:"js"}));}}],alias:{"@":root}});
  // In-process SQLite and object storage adapters: no browser or network listener.
  const blobStore=new Map();
  const binding={
    CUCCIOLI_PUBLIC_ORIGIN:"https://cuccioli-sv.web.app",
    CUCCIOLI_ADMIN_PASSWORD:"prueba-local-no-publicar",
    DB:null,
    BUCKET:{async put(k,b,o){blobStore.set(k,{bytes:b,httpMetadata:o?.httpMetadata});},async get(k){const v=blobStore.get(k);return v?{body:new Blob([v.bytes]).stream(),httpMetadata:v.httpMetadata}:null;}}
  };
  globalThis.__cuccioliTestEnv=binding;
  const route=(await import(`data:text/javascript;base64,${Buffer.from(worker.outputFiles[0].text).toString("base64")}`)).default;
  class IsolatedRuntime {
    constructor(){
      this.sqlite=new DatabaseSync(path.join(temp,"catalog.sqlite"));
      const database=this.sqlite;
      binding.DB={
        prepare(sql){let args=[];const stmt={bind(...values){args=values;return stmt;},async first(){return database.prepare(sql).get(...args)||null;},async all(){return {results:database.prepare(sql).all(...args),success:true};},async run(){database.prepare(sql).run(...args);return {results:[],success:true};}};return stmt;},
        async batch(statements){database.exec("BEGIN");try{const result=[];for(const stmt of statements)result.push(await stmt.run());database.exec("COMMIT");return result;}catch(e){database.exec("ROLLBACK");throw e;}}
      };
    }
    async getD1Database(){return binding.DB;}
    async dispatchFetch(url,init){return route.fetch(new Request(url,init));}
    async dispose(){this.sqlite.close();}
  }
  const options={};
  mf=new IsolatedRuntime(options);const db=await mf.getD1Database("DB");
  await db.prepare(await readFile(path.join(root,"drizzle/0000_silky_old_lace.sql"),"utf8")).run();
  let cookie="";
  const request=async(url,method="GET",data,withAuth=true,origin="https://cuccioli.test")=>{
    const form=data instanceof FormData;
    const res=await mf.dispatchFetch(`https://cuccioli.test${url}`,{method,headers:{Origin:origin,...(withAuth&&cookie?{Cookie:cookie}:{}),...(data&&!form?{"Content-Type":"application/json"}:{})},body:data?(form?data:JSON.stringify(data)):undefined});
    const body=await res.json();return {res,body};
  };
  const catalog=await request("/api/catalog");assert.equal(catalog.res.status,200);assert.equal(catalog.body.products.length,37);assert.equal(catalog.body.settings.businessName,"Cuccioli");assert.doesNotMatch(JSON.stringify(catalog.body),/passwordHash|adminPassword|prueba-local-no-publicar/);
  assert.equal((await request("/api/admin/data")).res.status,401);
  assert.equal((await request("/api/admin/products","POST",sample)).res.status,401);
  assert.equal((await request("/api/admin/login","POST",{password:"incorrecta"})).res.status,401);
  const login=await request("/api/admin/login","POST",{password:"prueba-local-no-publicar"});assert.equal(login.res.status,200);cookie=login.res.headers.get("set-cookie").split(";")[0];assert.match(login.res.headers.get("set-cookie"),/HttpOnly/);
  assert.equal((await request("/api/admin/data")).res.status,200);
  assert.equal((await request("/api/admin/products","POST",sample,true,"https://otro.test")).res.status,403);
  console.log("PASS · catálogo público, contraseña, sesión protegida y bloqueo de origen ajeno");
  const externalOrigin=binding.CUCCIOLI_PUBLIC_ORIGIN;
  const external=async(url,method="GET",data,token="",origin=externalOrigin)=>mf.dispatchFetch(`https://cuccioli.test${url}`,{method,headers:{Origin:origin,"Sec-Fetch-Site":"cross-site",...(token?{Authorization:`Bearer ${token}`} : {}),...(data?{"Content-Type":"application/json"}: {})},body:data?JSON.stringify(data):undefined});
  const preflight=await external("/api/admin/login","OPTIONS");assert.equal(preflight.status,204);assert.equal(preflight.headers.get("access-control-allow-origin"),externalOrigin);assert.match(preflight.headers.get("access-control-allow-headers"),/Authorization/);
  const denied=await external("/api/admin/data");assert.equal(denied.status,401);assert.equal(denied.headers.get("access-control-allow-origin"),externalOrigin);
  const externalLogin=await external("/api/admin/login","POST",{password:"prueba-local-no-publicar"});assert.equal(externalLogin.status,200);assert.equal(externalLogin.headers.has("set-cookie"),false);
  const {token:externalToken}=await externalLogin.json();assert.match(externalToken,/^[a-f0-9]{64}$/);assert.equal(login.body.token,undefined);
  assert.equal((await external("/api/admin/data","GET",undefined,externalToken)).status,200);
  const hostile=await external("/api/admin/data","GET",undefined,externalToken,"https://hostil.test");assert.equal(hostile.status,403);assert.equal(hostile.headers.has("access-control-allow-origin"),false);
  assert.equal((await external("/api/admin/login","OPTIONS",undefined,"","https://hostil.test")).status,403);
  assert.equal((await external("/api/admin/data","GET",undefined,"f".repeat(64))).status,401);
  assert.equal((await request("/api/admin/data","GET",undefined,true,externalOrigin)).res.status,401); // Cross-origin never falls back to a cookie.
  const bearerCreated=await external("/api/admin/products","POST",sample,externalToken);assert.equal(bearerCreated.status,200);const bearerProduct=(await bearerCreated.json()).product;
  assert.equal((await external(`/api/admin/products/${bearerProduct.id}`,"DELETE",undefined,externalToken)).status,200);
  assert.equal((await external("/api/admin/logout","POST",undefined,externalToken)).status,200);
  assert.equal((await external("/api/admin/data","GET",undefined,externalToken)).status,401);
  assert.equal((await request("/api/admin/data")).res.status,200); // Original cookie session is unaffected.
  console.log("PASS · Firebase: CORS limitado, sesión sin cookies de terceros, escrituras, rechazo de orígenes y cierre de sesión");


  const created=await request("/api/admin/products","POST",sample);assert.equal(created.res.status,200,JSON.stringify(created.body));const p=created.body.product;
  assert.equal((await request("/api/catalog")).body.products.length,38);
  let saved=await request("/api/admin/products","PUT",{...p,active:false});assert.equal(saved.res.status,200);
  assert.equal((await request("/api/catalog")).body.products.some(x=>x.id===p.id),false);
  saved=await request("/api/admin/products","PUT",{...p,name:"Producto de prueba",variants:[{id:"b",size:"7 kg",price:80,promoPrice:60,active:true},...p.variants]});assert.equal(saved.res.status,200);
  const promo=await request("/api/admin/promotions","POST",{id:p.id,isOnPromotion:true,prices:[{id:"b",promoPrice:50},{id:"a",promoPrice:25}]});assert.equal(promo.res.status,200,JSON.stringify(promo.body));
  const visible=(await request("/api/catalog")).body.products.find(x=>x.id===p.id);assert.equal(visible.variants[0].size,"7 kg");assert.equal(visible.variants[0].promoPrice,50);assert.equal(visible.name,"Producto de prueba");
  const invalid=await request("/api/admin/promotions","POST",{id:p.id,isOnPromotion:true,prices:[{id:"a",promoPrice:100}]});assert.equal(invalid.res.status,400);
  console.log("PASS · alta, edición, ocultación, orden de variantes y promociones compartidas");

  const image=new FormData();image.set("image",new File([Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aJ1cAAAAASUVORK5CYII=","base64")],"imagen.png",{type:"image/png"}));
  const uploaded=await request("/api/admin/upload","POST",image);assert.equal(uploaded.res.status,200,JSON.stringify(uploaded.body));
  const imageResponse=await mf.dispatchFetch(`https://cuccioli.test${uploaded.body.imageUrl}`);assert.equal(imageResponse.status,200);assert.equal(imageResponse.headers.get("content-type"),"image/png");
  const invalidFile=new FormData();invalidFile.set("image",new File(["<script>alert(1)</script>"],"imagen.png",{type:"image/png"}));assert.equal((await request("/api/admin/upload","POST",invalidFile)).res.status,400);
  const settings={...catalog.body.settings,whatsappNumber:"50371234567",tagline:"Sus favoritos hasta tu puerta"};assert.equal((await request("/api/admin/settings","PUT",settings)).res.status,200);assert.equal((await request("/api/catalog")).body.settings.whatsappNumber,"50371234567");
  await mf.dispose();mf=new IsolatedRuntime(options);
  assert.equal((await request("/api/catalog")).body.products.find(x=>x.id===p.id).name,"Producto de prueba");assert.equal((await request("/api/catalog")).body.settings.whatsappNumber,"50371234567");
  console.log("PASS · subida real de imagen, rechazo de archivo falso y persistencia tras reiniciar");

  assert.equal((await request(`/api/admin/products/${p.id}`,"DELETE")).res.status,200);assert.equal((await request("/api/catalog")).body.products.length,37);
  assert.equal((await request("/api/admin/password","POST",{currentPassword:"prueba-local-no-publicar",newPassword:"claveNueva5678",confirmPassword:"claveNueva5678"})).res.status,200);
  assert.equal((await request("/api/admin/data")).res.status,401);
  const newLogin=await request("/api/admin/login","POST",{password:"claveNueva5678"});assert.equal(newLogin.res.status,200);cookie=newLogin.res.headers.get("set-cookie").split(";")[0];
  assert.equal((await request("/api/admin/logout","POST")).res.status,200);assert.equal((await request("/api/admin/data")).res.status,401);
  console.log("PASS · eliminación, cambio de contraseña, revocación y cierre de sesión");
  let taxonomy=(await request("/api/catalog")).body.taxonomy;
  assert.ok(taxonomy.categories.some(c=>c.id==="care"));
  assert.ok(taxonomy.brands.find(b=>b.name==="Purina").categoryIds.includes("litter"));
  assert.ok(taxonomy.brands.find(b=>b.name==="Katu").categoryIds.includes("care"));
  const protectedWrite=await request("/api/admin/organizacion","POST",{kind:"category",action:"save",entity:{},revision:taxonomy.revision},false);
  assert.equal(protectedWrite.res.status,401);
  const orgLogin=await request("/api/admin/login","POST",{password:"claveNueva5678"});cookie=orgLogin.res.headers.get("set-cookie").split(";")[0];
  async function organization(kind,action,entity){const r=await request("/api/admin/organizacion","POST",{kind,action,entity,revision:taxonomy.revision});if(r.res.status===200)taxonomy=r.body.taxonomy;return r;}
  const category={id:"accessories",title:"Accesorios",short:"Accesorios",description:"Para jugar",icon:"paw",active:true};
  assert.equal((await organization("category","save",category)).res.status,200);
  let customBrand={id:"nueva-marca",name:"Nueva marca",active:true,featured:true,categoryIds:["accessories"],subBrands:[{id:"linea",name:"Línea nueva",categoryIds:["accessories"],active:true}]};
  assert.equal((await organization("brand","save",customBrand)).res.status,200);
  const custom=(await request("/api/admin/products","POST",{...sample,petType:"accessories",brand:"Nueva marca",brandId:"nueva-marca",subBrand:"Línea nueva",subBrandId:"linea"}));assert.equal(custom.res.status,200,JSON.stringify(custom.body));
  const customId=custom.body.product.id;
  assert.equal((await organization("category","delete",category)).res.status,400);
  assert.equal((await organization("brand","delete",customBrand)).res.status,400);
  assert.equal((await organization("brand","save",{...customBrand,subBrands:[]})).res.status,400);
  const oldRevision=taxonomy.revision;
  customBrand={...customBrand,name:"Marca renombrada",subBrands:[{...customBrand.subBrands[0],name:"Línea renombrada"}]};
  assert.equal((await organization("brand","save",customBrand)).res.status,200);
  assert.equal(taxonomy.brands.find(b=>b.id===customBrand.id).path,"nueva-marca");
  let renamed=(await request("/api/catalog")).body.products.find(p=>p.id===customId);assert.equal(renamed.brand,"Marca renombrada");assert.equal(renamed.subBrand,"Línea renombrada");assert.equal(renamed.variants[0].price,sample.variants[0].price);
  assert.equal((await request("/api/admin/organizacion","POST",{kind:"brand",action:"save",entity:customBrand,revision:oldRevision})).res.status,409);
  assert.equal((await organization("category","save",{...category,title:"Juguetes y accesorios",short:"Juguetes"})).res.status,200);assert.equal(taxonomy.categories.find(c=>c.id===category.id).path,"accesorios");
  assert.equal((await organization("brand","save",{...customBrand,active:false})).res.status,200);assert.ok(!(await request("/api/catalog")).body.products.some(p=>p.id===customId));assert.ok((await request("/api/admin/data")).body.products.some(p=>p.id===customId));
  assert.equal((await organization("brand","save",customBrand)).res.status,200);assert.ok((await request("/api/catalog")).body.products.some(p=>p.id===customId));
  assert.equal((await organization("brand","save",{...customBrand,subBrands:[{...customBrand.subBrands[0],active:false}]})).res.status,200);assert.ok(!(await request("/api/catalog")).body.products.some(p=>p.id===customId));
  assert.equal((await organization("brand","save",customBrand)).res.status,200);
  assert.equal((await organization("category","save",{...category,active:false})).res.status,200);assert.ok(!(await request("/api/catalog")).body.products.some(p=>p.id===customId));
  assert.equal((await request(`/api/admin/products/${customId}`,"DELETE")).res.status,200);
  assert.equal((await organization("brand","delete",customBrand)).res.status,200);assert.equal((await organization("category","delete",category)).res.status,200);
  assert.equal((await organization("category","save",{...category,id:"blocked",title:"Admin"})).res.status,400);
  const invalidBrandProduct=await request("/api/admin/products","POST",{...sample,brandId:"no-existe"});assert.equal(invalidBrandProduct.res.status,400);
  console.log("PASS · categorías, marcas y submarcas: alta, nombres, vínculos, visibilidad, eliminación protegida y conflictos");

  const migrated=new Map();globalThis.__migrationRecords=migrated;
  const migrationBuild=await build({stdin:{contents:'export {bootstrap} from "./server/store.ts";',resolveDir:root},bundle:true,write:false,format:"esm",platform:"node",alias:{"@":root},plugins:[{name:"migration",setup(b){
    b.onResolve({filter:/^cloudflare:workers$/},()=>({path:"env",namespace:"migration"}));
    b.onResolve({filter:/^\.\/firebase$/},()=>({path:"firebase",namespace:"migration"}));
    b.onLoad({filter:/.*/,namespace:"migration"},args=>({contents:args.path==="env"?'export const env=globalThis.__cuccioliTestEnv;':`export const firebaseEnabled=()=>true;export const documentRoot=()=>"projects/test/databases/(default)/documents";export const toFields=x=>x;export const fromFields=x=>x;export async function firestoreRequest(path,init){const m=globalThis.__migrationRecords;if(path===":commit"){const {writes}=JSON.parse(init.body);if(writes.some(w=>m.has(w.update.name)))throw Error("exists");for(const w of writes){if(w.currentDocument.exists!==false)throw Error("unsafe");m.set(w.update.name,w.update.fields);}return {};}const fields=m.get(documentRoot()+path);return fields?{fields}:null;}`,loader:"js"}));
  }}]});
  const beforeAdmin=await binding.DB.prepare("SELECT value FROM records WHERE collection='private' AND id='admin'").first();
  const {bootstrap:migrate}=await import(`data:text/javascript;base64,${Buffer.from(migrationBuild.outputFiles[0].text).toString("base64")}`);
  await migrate();
  const prefix="projects/test/databases/(default)/documents/";
  assert.deepEqual(migrated.get(prefix+"private/admin"),JSON.parse(beforeAdmin.value));
  assert.equal(migrated.get(prefix+"settings/main").whatsappNumber,"50371234567");
  assert.equal([...migrated.keys()].filter(k=>k.includes("/products/")).length,37);
  assert.ok(![...migrated.keys()].some(k=>k.includes("/sessions/")));
  await migrate();assert.equal(migrated.size,41);
  console.log("PASS · migración conserva catálogo, ajustes y contraseña; no copia sesiones ni sobrescribe datos");
} finally {if(mf)await mf.dispose();await rm(temp,{recursive:true,force:true});}
