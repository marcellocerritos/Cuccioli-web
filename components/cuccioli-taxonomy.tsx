"use client";
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Layers3, Store, Plus, Pencil, Trash2, Search, Save, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { api } from '@/lib/client';
import { slug } from '@/lib/catalog';
import { findBrand, iconOptions, type CatalogBrand, type CatalogCategory } from '@/lib/taxonomy';
import { useAdmin, AdminHeading, Loading, Field, Toggle, Choose, Spinner, ErrorNotice } from './cuccioli-admin';

type Entity=CatalogBrand|CatalogCategory;
const errorMessage=(e:unknown)=>e instanceof Error?e.message:'No pudimos guardar los cambios.';
function CategoryChecks({categories,selected,onChange,label}:{categories:CatalogCategory[];selected:string[];onChange:(ids:string[])=>void;label:string}){
  return <fieldset className="category-checks"><legend>{label}</legend>{categories.length?categories.map(c=><label key={c.id}><Checkbox checked={selected.includes(c.id)} onCheckedChange={checked=>onChange(checked?[...selected,c.id]:selected.filter(id=>id!==c.id))}/><span>{c.title}{!c.active&&<small> · Oculta</small>}</span></label>):<p className="field-help">Agregá primero una categoría.</p>}</fieldset>;
}
export function AdminBrands(){return <Organization kind="brand"/>;}
export function AdminCategories(){return <Organization kind="category"/>;}
function Organization({kind}:{kind:'brand'|'category'}){
  const {data,refresh}=useAdmin();const [search,setSearch]=useState('');const [editing,setEditing]=useState<Entity|null>(null);const [revision,setRevision]=useState(0);const [deleting,setDeleting]=useState<Entity|null>(null);const [busy,setBusy]=useState(false);const [error,setError]=useState('');
  const isBrand=kind==='brand', singular=isBrand?'marca':'categoría';
  if(!data)return <Loading/>;const t=data.taxonomy;const items=isBrand?t.brands:t.categories;
  const name=(e:Entity)=>'name' in e?e.name:e.title;
  const count=(e:Entity)=>data.products.filter(p=>isBrand?findBrand(t,p)?.id===e.id:p.petType===e.id).length;
  function edit(entity:Entity){setRevision(t.revision);setEditing(structuredClone(entity));setError('');}
  function add(){edit(isBrand?{id:crypto.randomUUID(),name:'',path:'',aliases:[],categoryIds:[],subBrands:[],active:true,featured:false}:{id:crypto.randomUUID(),path:'',title:'',short:'',description:'',icon:'paw',active:true});}
  async function mutate(entity:Entity,action='save',savedRevision=t.revision){
    setBusy(true);setError('');try{await api('/api/admin/organizacion','POST',{kind,action,entity,revision:savedRevision});await refresh();setEditing(null);setDeleting(null);toast.success(action==='delete'?`${isBrand?'Marca eliminada':'Categoría eliminada'}`:'Cambios guardados');}
    catch(e){setError(errorMessage(e));}finally{setBusy(false);}
  }
  const draftBrand=editing&&'name' in editing?editing:null;const draftCategory=editing&&'title' in editing?editing:null;
  const filtered=items.filter(e=>slug(name(e)).includes(slug(search)));
  return <>
    <AdminHeading eyebrow="ORGANIZÁ TU TIENDA" title={isBrand?'Marcas':'Categorías'} description={isBrand?'Administrá las marcas que distribuís, sus líneas y dónde aparecen.':'Creá las secciones de tu catálogo y elegí cuáles mostrar.'}><button className="btn btn-primary" onClick={add}><Plus size={18}/>{isBrand?'Agregar marca':'Agregar categoría'}</button></AdminHeading>
    <div className="organization-intro"><p>Ocultar una {singular} también oculta sus productos en la tienda. Se conservan para volver a mostrarlos cuando quieras.</p><Link className="text-link" to={isBrand?'/admin/categorias':'/admin/marcas'}>{isBrand?'Administrar categorías':'Asignar marcas a categorías'}</Link></div>
    <div className="search-field organization-search"><Search size={19}/><Input className="field" aria-label={`Buscar ${singular}`} placeholder={`Buscar ${singular}…`} value={search} onChange={e=>setSearch(e.target.value)}/></div>
    {!editing&&!deleting&&<ErrorNotice text={error}/>}
    <div className="organization-grid">{filtered.map(entity=><article className="admin-panel organization-card" key={entity.id}>
      <div className="organization-card-heading"><span className="organization-icon">{isBrand?<Store size={23}/>:<Layers3 size={23}/>}</span><div><h2>{name(entity)}</h2><span>{count(entity)} productos · {entity.active?'Visible':'Oculta'}</span></div></div>
      {'name' in entity?<><div className="organization-tags">{entity.categoryIds.map(id=><span key={id}>{t.categories.find(c=>c.id===id)?.title}</span>)}{!entity.categoryIds.length&&<span>Sin categorías asignadas</span>}</div><p className="organization-detail">{entity.subBrands.length?entity.subBrands.map(s=>s.name+(s.active?'':' (oculta)')).join(' · '):'Sin submarcas'}{entity.featured&&<small>Seleccionada para la franja de marcas</small>}</p></>:<p className="organization-detail">{entity.description||'Sin descripción'}<small>{t.brands.filter(b=>b.categoryIds.includes(entity.id)).length} marcas asignadas</small></p>}
      <div className="organization-card-actions"><label><Switch checked={entity.active} disabled={busy} aria-label={`Mostrar ${name(entity)}`} onCheckedChange={active=>void mutate({...entity,active})}/>Mostrar</label><div><button className="icon-button" disabled={busy} onClick={()=>edit(entity)} aria-label={`Editar ${name(entity)}`}><Pencil size={18}/></button><button className="icon-button delete" disabled={busy} onClick={()=>{setDeleting(entity);setError('');setRevision(t.revision);}} aria-label={`Eliminar ${name(entity)}`}><Trash2 size={18}/></button></div></div>
    </article>)}</div>{!filtered.length&&<div className="admin-panel organization-empty"><h2>No hay {isBrand?'marcas':'categorías'} en esta selección</h2><p>{search?'Probá con otro nombre.':`Usá el botón de arriba para agregar una ${singular}.`}</p></div>}
    <Dialog open={!!editing} onOpenChange={open=>{if(!open&&!busy)setEditing(null);}}><DialogContent className="organization-dialog" showCloseButton={!busy}><DialogHeader><DialogTitle>{items.some(e=>e.id===editing?.id)?'Editar':'Agregar'} {singular}</DialogTitle><DialogDescription>{isBrand?'Los nombres se actualizan en los productos sin perder sus precios ni imágenes.':'El nombre se actualiza en el menú y en los productos de esta categoría.'}</DialogDescription></DialogHeader>
      <form onSubmit={(e:FormEvent)=>{e.preventDefault();if(editing)void mutate(editing,'save',revision);}}><fieldset disabled={busy} className="organization-fields">
        {draftBrand&&<>
          <Field label="Nombre de la marca"><Input aria-label="Nombre de la marca" className="field" required minLength={2} maxLength={100} value={draftBrand.name} placeholder="Ej. Purina" onChange={e=>setEditing({...draftBrand,name:e.target.value})}/></Field>
          <CategoryChecks label="Categorías donde se ofrece" categories={t.categories} selected={draftBrand.categoryIds} onChange={categoryIds=>setEditing({...draftBrand,categoryIds,subBrands:draftBrand.subBrands.map(s=>({...s,categoryIds:s.categoryIds.filter(c=>categoryIds.includes(c))}))})}/>
          <p className="field-help">Una marca puede estar en varias categorías. Al desmarcar una, sus productos dejan de mostrarse en esa sección.</p>
          <Toggle id="brand-active" label="Mostrar marca" checked={draftBrand.active} onChange={active=>setEditing({...draftBrand,active})}/>
          <Toggle id="brand-featured" label="Mostrar en la franja de marcas" description="Aparece en la portada con el símbolo ® cuando la marca está visible." checked={draftBrand.featured} onChange={featured=>setEditing({...draftBrand,featured})}/>
          <div className="form-section-heading"><div><h2>Submarcas o líneas</h2><p>Por ejemplo: Pro Plan, Dog Chow o Cat Chow.</p></div><button className="btn btn-outline btn-small" type="button" disabled={draftBrand.subBrands.length>=60} onClick={()=>setEditing({...draftBrand,subBrands:[...draftBrand.subBrands,{id:crypto.randomUUID(),name:'',aliases:[],categoryIds:[...draftBrand.categoryIds],active:true}]})}><Plus size={16}/>Agregar submarca</button></div>
          {draftBrand.subBrands.map((sub,index)=><div className="subbrand-editor" key={sub.id}><div className="subbrand-name"><Input className="field" required minLength={2} maxLength={100} aria-label={`Nombre de submarca ${index+1}`} value={sub.name} placeholder="Nombre de la submarca" onChange={e=>setEditing({...draftBrand,subBrands:draftBrand.subBrands.map(s=>s.id===sub.id?{...s,name:e.target.value}:s)})}/><button type="button" className="icon-button delete" aria-label={`Quitar submarca ${sub.name||index+1}`} onClick={()=>setEditing({...draftBrand,subBrands:draftBrand.subBrands.filter(s=>s.id!==sub.id)})}><X size={18}/></button></div><CategoryChecks label="Disponible en" categories={t.categories.filter(c=>draftBrand.categoryIds.includes(c.id))} selected={sub.categoryIds} onChange={categoryIds=>setEditing({...draftBrand,subBrands:draftBrand.subBrands.map(s=>s.id===sub.id?{...s,categoryIds}:s)})}/><Toggle id={`sub-${sub.id}`} label="Mostrar submarca" checked={sub.active} onChange={active=>setEditing({...draftBrand,subBrands:draftBrand.subBrands.map(s=>s.id===sub.id?{...s,active}:s)})}/></div>)}
        </>}
        {draftCategory&&<>
          <Field label="Nombre de la categoría"><Input className="field" required minLength={2} maxLength={100} aria-label="Nombre de la categoría" placeholder="Ej. Higiene y cuidado" value={draftCategory.title} onChange={e=>setEditing({...draftCategory,title:e.target.value,short:draftCategory.short===draftCategory.title?e.target.value.slice(0,60):draftCategory.short})}/></Field>
          <Field label="Nombre corto en el menú"><Input className="field" required minLength={2} maxLength={60} aria-label="Nombre corto en el menú" value={draftCategory.short} onChange={e=>setEditing({...draftCategory,short:e.target.value})}/></Field>
          <Field label="Descripción (opcional)"><Textarea className="field" maxLength={240} rows={3} aria-label="Descripción de la categoría" value={draftCategory.description} onChange={e=>setEditing({...draftCategory,description:e.target.value})}/></Field>
          <Field label="Ícono"><Choose label="Ícono de la categoría" value={draftCategory.icon} options={iconOptions} onChange={icon=>setEditing({...draftCategory,icon})}/></Field>
          <Toggle id="category-active" label="Mostrar categoría" checked={draftCategory.active} onChange={active=>setEditing({...draftCategory,active})}/>
          <p className="field-help">Después de guardar, entrá en Marcas para elegir cuáles pertenecen a esta categoría.</p>
        </>}
        <ErrorNotice text={error}/><div className="organization-save"><button className="btn btn-outline" type="button" onClick={()=>setEditing(null)}>Cancelar</button><button className="btn btn-primary" type="submit">{busy?<Spinner/>:<Save size={18}/>}Guardar {singular}</button></div>
      </fieldset></form>
    </DialogContent></Dialog>
    <AlertDialog open={!!deleting} onOpenChange={open=>{if(!open&&!busy)setDeleting(null);}}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>¿Eliminar {deleting?name(deleting):singular}?</AlertDialogTitle><AlertDialogDescription>{deleting&&count(deleting)>0?`Tiene ${count(deleting)} productos. Para conservarlos, podés ocultar la ${singular}. Para eliminarla, primero reasigná o eliminá sus productos.`:`Se quitará esta ${singular} de la administración y del catálogo.`}</AlertDialogDescription></AlertDialogHeader><ErrorNotice text={error}/><AlertDialogFooter><AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>{deleting&&count(deleting)>0?<AlertDialogAction disabled={busy} onClick={e=>{e.preventDefault();void mutate({...deleting,active:false},'save',revision);}}>Ocultar {singular}</AlertDialogAction>:<AlertDialogAction className="danger-button" disabled={busy} onClick={e=>{e.preventDefault();if(deleting)void mutate(deleting,'delete',revision);}}>{busy?'Eliminando…':'Eliminar'}</AlertDialogAction>}</AlertDialogFooter></AlertDialogContent></AlertDialog>
  </>;
}
