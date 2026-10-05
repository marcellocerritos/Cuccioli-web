import { env } from 'cloudflare:workers';
import { z } from 'zod';
import { slug, type Product } from '@/lib/catalog';
import { findBrand, findSubBrand, initialTaxonomy, projectProduct, type Taxonomy, type CatalogBrand, type CatalogCategory } from '@/lib/taxonomy';
import { firebaseEnabled, firestoreRequest, documentRoot, toFields, fromFields } from './firebase';
import { getRecord, listRecords } from './store';
import { HttpError } from './security';

const identifier=z.string().regex(/^[a-z0-9-]{1,80}$/,'Identificador no válido.');
const label=z.string().trim().min(2,'Ingresá un nombre de al menos 2 caracteres.').max(100).refine(v=>!!slug(v),'Ingresá un nombre con letras o números.');
const subSchema=z.object({id:identifier,name:label,categoryIds:z.array(identifier).max(100),active:z.boolean()});
const brandSchema=z.object({id:identifier,name:label,categoryIds:z.array(identifier).max(100),active:z.boolean(),featured:z.boolean(),subBrands:z.array(subSchema).max(60)});
const categorySchema=z.object({id:identifier,title:label,short:z.string().trim().min(2).max(60),description:z.string().trim().max(240),icon:z.enum(['dog','cat','litter','medicine','care','paw']),active:z.boolean()});

export async function getTaxonomy():Promise<Taxonomy>{
  const found=await getRecord<Taxonomy>('settings','catalog');if(found)return found;
  const next=initialTaxonomy(await listRecords<Product>('products'));
  if(firebaseEnabled()){
    try{await firestoreRequest(':commit',{method:'POST',body:JSON.stringify({writes:[{update:{name:`${documentRoot()}/settings/catalog`,fields:toFields(next)},currentDocument:{exists:false}}]})});}
    catch(e){const concurrent=await getRecord<Taxonomy>('settings','catalog');if(concurrent)return concurrent;throw e;}
  }else await env.DB.prepare("INSERT OR IGNORE INTO records(collection,id,value) VALUES ('settings','catalog',?)").bind(JSON.stringify(next)).run();
  return (await getRecord<Taxonomy>('settings','catalog'))!;
}
function parse<T>(schema:z.ZodType<T>,value:unknown){const r=schema.safeParse(value);if(!r.success)throw new HttpError(400,r.error.issues[0].message);return r.data;}
function uniqueNames(items:{name:string;aliases?:string[]}[]){const names=new Set<string>();for(const item of items){for(const name of new Set([item.name,...item.aliases||[]].map(slug))){if(names.has(name))throw new HttpError(400,'Ya existe una marca o submarca con ese nombre.');names.add(name);}}}
export function editTaxonomy(current:Taxonomy,input:any,products:Product[]):Taxonomy{
  if(input?.revision!==current.revision)throw new HttpError(409,'La organización cambió en otra ventana. Cerrá la edición y volvé a abrirla.');
  if(!['brand','category'].includes(input.kind)||!['save','delete'].includes(input.action))throw new HttpError(400,'Elegí una opción válida.');
  const next=structuredClone(current);const id=parse(identifier,input.entity?.id);
  if(input.kind==='brand'){
    const old=next.brands.find(b=>b.id===id);const assigned=products.filter(p=>findBrand(current,p)?.id===id);
    if(input.action==='delete'){
      if(!old)throw new HttpError(404,'La marca ya no existe.');
      if(assigned.length)throw new HttpError(400,`Esta marca tiene ${assigned.length} productos. Ocultala o cambiá la marca de esos productos antes de eliminarla.`);
      next.brands=next.brands.filter(b=>b.id!==id);
    }else{
      const parsed=parse(brandSchema,input.entity);
      if(parsed.categoryIds.some(c=>!next.categories.some(x=>x.id===c)))throw new HttpError(400,'Elegí categorías que existan.');
      const subIds=new Set(parsed.subBrands.map(s=>s.id));if(subIds.size!==parsed.subBrands.length)throw new HttpError(400,'Las submarcas deben ser distintas.');
      for(const s of old?.subBrands||[])if(!subIds.has(s.id)&&assigned.some(p=>findSubBrand(old,p)?.id===s.id))throw new HttpError(400,`La submarca ${s.name} tiene productos. Ocultala o reasigná sus productos antes de quitarla.`);
      const brand:CatalogBrand={...parsed,path:old?.path||slug(parsed.name),aliases:[...new Set([...(old?.aliases||[]),...(old&&old.name!==parsed.name?[old.name]:[])])],subBrands:parsed.subBrands.map(s=>{const previous=old?.subBrands.find(x=>x.id===s.id);return {...s,categoryIds:[...new Set(s.categoryIds.filter(c=>parsed.categoryIds.includes(c)))],aliases:[...new Set([...(previous?.aliases||[]),...(previous&&previous.name!==s.name?[previous.name]:[])])]};})};
      uniqueNames(brand.subBrands);
      next.brands=old?next.brands.map(b=>b.id===id?brand:b):[...next.brands,brand];uniqueNames(next.brands);
      if(next.brands.some(b=>b.id!==id&&b.path===brand.path))throw new HttpError(400,'Ya existe una marca con ese nombre.');
    }
  }else{
    const old=next.categories.find(c=>c.id===id);
    if(input.action==='delete'){
      if(!old)throw new HttpError(404,'La categoría ya no existe.');
      const count=products.filter(p=>p.petType===id).length;if(count)throw new HttpError(400,`Esta categoría tiene ${count} productos. Ocultala o reasigná sus productos antes de eliminarla.`);
      next.categories=next.categories.filter(c=>c.id!==id);next.brands=next.brands.map(b=>({...b,categoryIds:b.categoryIds.filter(c=>c!==id),subBrands:b.subBrands.map(s=>({...s,categoryIds:s.categoryIds.filter(c=>c!==id)}))}));
    }else{
      const parsed=parse(categorySchema,input.entity);const category:CatalogCategory={...parsed,path:old?.path||slug(parsed.title)};
      if(['admin','api','catalogo','promociones'].includes(category.path)||next.categories.some(c=>c.id!==id&&(slug(c.title)===slug(category.title)||c.path===category.path)))throw new HttpError(400,'Ese nombre ya está en uso. Elegí otro nombre para la categoría.');
      next.categories=old?next.categories.map(c=>c.id===id?category:c):[...next.categories,category];
    }
  }
  if(next.categories.length>100||next.brands.length>200)throw new HttpError(400,'Se alcanzó el máximo de categorías o marcas.');
  if(JSON.stringify(next).length>250000)throw new HttpError(400,'La organización del catálogo es demasiado grande.');
  next.revision=current.revision+1;return next;
}
export async function saveTaxonomy(input:unknown){
  await getTaxonomy();
  const document=firebaseEnabled()?await firestoreRequest('/settings/catalog'):null;
  const current=document?fromFields(document.fields) as Taxonomy:(await getRecord<Taxonomy>('settings','catalog'))!;
  const products=await listRecords<Product>('products');const next=editTaxonomy(current,input,products);
  if(firebaseEnabled()){
    try{await firestoreRequest(':commit',{method:'POST',body:JSON.stringify({writes:[{update:{name:`${documentRoot()}/settings/catalog`,fields:toFields(next)},currentDocument:{updateTime:document.updateTime}}]})});}
    catch(e){if((await getRecord<Taxonomy>('settings','catalog'))?.revision!==current.revision)throw new HttpError(409,'Alguien guardó otros cambios. Cerrá la edición y volvé a abrirla.');throw e;}
  }else{
    const updated=await env.DB.prepare("UPDATE records SET value=? WHERE collection='settings' AND id='catalog' AND json_extract(value,'$.revision')=? RETURNING id").bind(JSON.stringify(next),current.revision).first();
    if(!updated)throw new HttpError(409,'Alguien guardó otros cambios. Cerrá la edición y volvé a abrirla.');
  }
  return next;
}
export function validateProductTaxonomy(p:Product,t:Taxonomy){
  const b=findBrand(t,p),c=t.categories.find(c=>c.id===p.petType),sub=findSubBrand(b,p);
  if(!c||!b||!b.categoryIds.includes(c.id))throw new HttpError(400,'Elegí una marca asignada a esta categoría. Podés organizarla en Marcas.');
  if((p.subBrand||p.subBrandId)&&(!sub||!sub.categoryIds.includes(c.id)))throw new HttpError(400,'Elegí una submarca de esta categoría o agregala en Marcas.');
  return {...projectProduct(p,t),brandId:b.id,subBrandId:sub?.id||'',subBrand:sub?.name||''};
}
