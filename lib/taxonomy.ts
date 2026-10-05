import { categories as seedCategories, seedProducts, slug, type Product } from './catalog';
export type CatalogCategory = { id:string; path:string; title:string; short:string; description:string; icon:string; active:boolean };
export type SubBrand = { id:string; name:string; aliases:string[]; categoryIds:string[]; active:boolean };
export type CatalogBrand = { id:string; name:string; path:string; aliases:string[]; categoryIds:string[]; subBrands:SubBrand[]; active:boolean; featured:boolean };
export type Taxonomy = { revision:number; categories:CatalogCategory[]; brands:CatalogBrand[] };
export const iconOptions = [{value:'dog',label:'Perro'},{value:'cat',label:'Gato'},{value:'litter',label:'Arena'},{value:'medicine',label:'Medicamento'},{value:'care',label:'Higiene y cuidado'},{value:'paw',label:'Mascotas'}];
export function initialTaxonomy(products:Product[] = seedProducts):Taxonomy {
  const categories:CatalogCategory[] = seedCategories.map(c=>({id:c.type,path:c.path,title:c.title,short:c.short,description:c.description,icon:c.type,active:true}));
  categories.push({id:'care',path:'higiene-y-cuidado',title:'Higiene y cuidado',short:'Higiene y cuidado',description:'Champús y cuidado diario para tu mascota',icon:'care',active:true});
  const brands:CatalogBrand[] = [...new Set(seedCategories.flatMap(c=>c.brands))].map(name=>({id:slug(name),name,path:slug(name),aliases:[],categoryIds:seedCategories.filter(c=>c.brands.includes(name)).map(c=>c.type),subBrands:[],active:true,featured:['Purina','Royal Canin','Pedigree','Nupec','Advance','Monello'].includes(name)}));
  brands.find(b=>b.name==='Purina')!.categoryIds.push('litter');
  brands.find(b=>b.name==='Katu')!.categoryIds.push('care');
  for (const p of [...seedProducts,...products]) {
    if(!categories.some(c=>c.id===p.petType))categories.push({id:p.petType,path:slug(p.petType),title:p.petType,short:p.petType,description:'',icon:'paw',active:true});
    let b=brands.find(b=>b.name===p.brand);
    if(!b){b={id:p.brandId||slug(p.brand),name:p.brand,path:slug(p.brand),aliases:[],categoryIds:[],subBrands:[],active:true,featured:false};brands.push(b);}
    if(!b.categoryIds.includes(p.petType))b.categoryIds.push(p.petType);
    if(p.subBrand){let sub=b.subBrands.find(s=>s.name===p.subBrand);if(!sub){sub={id:p.subBrandId||slug(p.subBrand),name:p.subBrand,aliases:[],categoryIds:[],active:true};b.subBrands.push(sub);}if(!sub.categoryIds.includes(p.petType))sub.categoryIds.push(p.petType);}
  }
  return {revision:1,categories,brands};
}
export const defaultTaxonomy=initialTaxonomy();
export function findBrand(t:Taxonomy,p:Pick<Product,'brand'|'brandId'>){return p.brandId?t.brands.find(b=>b.id===p.brandId):t.brands.find(b=>b.name===p.brand||b.aliases.includes(p.brand));}
export function findSubBrand(b:CatalogBrand|undefined,p:Pick<Product,'subBrand'|'subBrandId'>){return p.subBrandId?b?.subBrands.find(s=>s.id===p.subBrandId):b?.subBrands.find(s=>s.name===p.subBrand||s.aliases.includes(p.subBrand));}
export function projectProduct(p:Product,t:Taxonomy):Product{const b=findBrand(t,p);const s=findSubBrand(b,p);return {...p,brand:b?.name||p.brand,brandId:b?.id||p.brandId,subBrand:s?.name||p.subBrand,subBrandId:s?.id||p.subBrandId};}
export function productVisible(p:Product,t:Taxonomy){const c=t.categories.find(c=>c.id===p.petType),b=findBrand(t,p),s=findSubBrand(b,p);return p.active&&!!c?.active&&!!b?.active&&b.categoryIds.includes(p.petType)&&(!p.subBrand||!!s?.active&&s.categoryIds.includes(p.petType));}
export function categoryList(t:Taxonomy,visibleOnly=true){return t.categories.filter(c=>!visibleOnly||c.active).map(c=>({...c,type:c.id,brands:t.brands.filter(b=>(!visibleOnly||b.active)&&b.categoryIds.includes(c.id)).map(b=>b.name)}));}
export function brandPath(type:string,brand:string,t:Taxonomy=defaultTaxonomy){const c=t.categories.find(c=>c.id===type);const b=t.brands.find(b=>b.name===brand||b.id===brand||b.aliases.includes(brand));return c&&b?`/${c.path}/${b.path}`:'/catalogo';}
export const productPlaceholder='/placeholders/producto.svg';
