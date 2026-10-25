#!/usr/bin/env node
// Guardia de publicación: falla si alguna foto del catálogo en vivo no va a poder mostrarse
// con el build que se está por publicar. Se ejecuta en GitHub Actions antes de desplegar.
//  - /api/images/...   -> tiene que responder como imagen desde el backend (R2).
//  - cualquier otra ruta local -> el archivo tiene que existir dentro de firebase-dist/.
// Firebase responde con index.html (200) a rutas que no existen, así que sin esta revisión
// una foto faltante no da error: simplemente desaparece del sitio.

import { access } from "node:fs/promises";
import path from "node:path";

const API = process.env.CUCCIOLI_API || "https://cuccioli-api.m-cerritosal32007.workers.dev";
const DIST = "firebase-dist";

const res = await fetch(`${API}/api/catalog`);
if (!res.ok) { console.error(`No se pudo leer el catálogo (${res.status}).`); process.exit(1); }
const { products } = await res.json();

const problemas = [];
await Promise.all(products.map(async (p) => {
  const url = p.imageUrl || "";
  if (!url || /^https:\/\//.test(url)) return;
  if (url.startsWith("/api/images/")) {
    const r = await fetch(API + url);
    if (!r.ok || !(r.headers.get("content-type") || "").startsWith("image/")) problemas.push(`${p.id}: ${url} (backend ${r.status})`);
    await r.body?.cancel();
    return;
  }
  const ok = await access(path.join(DIST, url)).then(() => true, () => false);
  if (!ok) problemas.push(`${p.id}: ${url} (no está en ${DIST}/)`);
}));

if (problemas.length) {
  console.error(`\n${problemas.length} fotos no se verían después de publicar. Publicación cancelada:\n` + problemas.join("\n"));
  process.exit(1);
}
console.log(`Fotos verificadas: ${products.length} productos, todas se pueden mostrar.`);
