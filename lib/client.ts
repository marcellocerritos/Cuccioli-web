"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FirebaseOptions } from "firebase/app";
import type { Product, Settings } from "./catalog";
import { apiOrigin, apiUrl, getSession, setSession } from "./hosting";
import { defaultTaxonomy, projectProduct, productVisible, type Taxonomy } from "./taxonomy";
export class ApiError extends Error { constructor(message:string, public status:number){super(message);} }
export async function api<T=any>(path:string, method="GET", data?:unknown):Promise<T> {
  const isForm=data instanceof FormData;
  const headers:Record<string,string>=data&&!isForm?{"Content-Type":"application/json"}:{};
  if(apiOrigin&&path.startsWith("/api/admin/")&&getSession())headers.Authorization=`Bearer ${getSession()}`;
  const res=await fetch(apiUrl(path),{method,credentials:apiOrigin?"omit":"same-origin",headers,body:data?(isForm?data:JSON.stringify(data)):undefined});
  const result=await res.json().catch(()=>({error:"No pudimos conectar. Intentá nuevamente."}));
  if(!res.ok)throw new ApiError(result.error||"No pudimos completar la solicitud.",res.status);
  if(apiOrigin&&path==="/api/admin/login"&&typeof result.token==="string")setSession(result.token);
  if(apiOrigin&&(path==="/api/admin/logout"||path==="/api/admin/password"))setSession("");
  return result;
}
export type CatalogData={products:Product[];settings:Settings;taxonomy:Taxonomy;mode:"firebase"|"preview";firebase?:FirebaseOptions|null};
export function useCatalog(admin=false) {
  const [data,setData]=useState<CatalogData|null>(null);const [error,setError]=useState("");const busy=useRef(false);
  const refresh=useCallback(async()=>{
    if(busy.current)return;busy.current=true;
    try{const next=await api<CatalogData>(admin?"/api/admin/data":"/api/catalog");setData(next);setError("");}
    catch(e){setError(e instanceof Error?e.message:"No pudimos cargar el catálogo.");}finally{busy.current=false;}
  },[admin]);
  useEffect(()=>{void refresh();},[refresh]);
  const config=data?.firebase;const project=config?.projectId;
  useEffect(()=>{
    if(!admin&&config&&project){
      let cancelled=false;let stop:(()=>void)|undefined;
      const onError=()=>setError("No pudimos actualizar el catálogo. Revisá tu conexión e intentá nuevamente.");
      import("./firebase-client").then(({listenToCatalog})=>{if(cancelled)return;stop=listenToCatalog(config,products=>{setData(prev=>prev?{...prev,products}:prev);setError("");},settings=>setData(prev=>prev?{...prev,settings}:prev),taxonomy=>setData(prev=>prev?{...prev,taxonomy}:prev),onError);}).catch(onError);
      return()=>{cancelled=true;stop?.();};
    }
    const timer=window.setInterval(()=>{if(document.visibilityState==="visible")void refresh();},3500);
    const visible=()=>{if(document.visibilityState==="visible")void refresh();};document.addEventListener("visibilitychange",visible);
    return()=>{clearInterval(timer);document.removeEventListener("visibilitychange",visible);};
  },[admin,project,refresh]);
  const projected=useMemo(()=>data?{...data,taxonomy:data.taxonomy||defaultTaxonomy,products:data.products.map(p=>projectProduct(p,data.taxonomy||defaultTaxonomy)).filter(p=>admin||productVisible(p,data.taxonomy||defaultTaxonomy))}:null,[data,admin]);
  return {data:projected,error,refresh};
}
