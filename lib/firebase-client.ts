"use client";
import { initializeApp, getApps, type FirebaseOptions } from "firebase/app";
import { getFirestore, collection, doc, onSnapshot, query, where, Timestamp } from "firebase/firestore";
import type { Product, Settings } from "./catalog";
import type { Taxonomy } from "./taxonomy";
export function listenToCatalog(config:FirebaseOptions, products:(p:Product[])=>void, settings:(s:Settings)=>void, taxonomy:(t:Taxonomy)=>void, error:()=>void) {
  const app=getApps().find(a=>a.name===config.projectId)||initializeApp(config,config.projectId);const db=getFirestore(app);
  const stopProducts=onSnapshot(query(collection(db,"products"),where("active","==",true)),snapshot=>products(snapshot.docs.map(d=>{
    const p=d.data();return {...p,id:d.id,createdAt:p.createdAt instanceof Timestamp?p.createdAt.toDate().toISOString():p.createdAt,promotionEndDate:p.promotionEndDate instanceof Timestamp?p.promotionEndDate.toDate().toISOString():p.promotionEndDate} as Product;
  }).sort((a,b)=>a.order-b.order)),error);
  const stopSettings=onSnapshot(doc(db,"settings","main"),snapshot=>{if(snapshot.exists())settings(snapshot.data() as Settings);},error);
  const stopTaxonomy=onSnapshot(doc(db,"settings","catalog"),snapshot=>{if(snapshot.exists())taxonomy(snapshot.data() as Taxonomy);},error);
  return()=>{stopProducts();stopSettings();stopTaxonomy();};
}
