#!/usr/bin/env node
// Genera firebase-dist/sitemap.xml con las páginas que Google debe conocer:
// páginas fijas + categorías + marcas por categoría + cada producto visible.
// Lee el catálogo en vivo (igual que verificar-fotos.mjs). Si la API no responde,
// publica solo las páginas fijas y avisa, sin cancelar la publicación.

import { writeFile } from "node:fs/promises";

const SITE = process.env.CUCCIOLI_SITE || "https://cuccioli-sv.web.app";
const API = process.env.CUCCIOLI_API || "https://cuccioli-api.m-cerritosal32007.workers.dev";
const OUT = "firebase-dist/sitemap.xml";

const urls = new Map(); // path -> { priority, lastmod }
const add = (path, priority, lastmod) => { if (!urls.has(path)) urls.set(path, { priority, lastmod }); };
add("/", "1.0"); add("/catalogo", "0.9"); add("/promociones", "0.8"); add("/encontra-su-comida", "0.7");

try {
  const res = await fetch(`${API}/api/catalog`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const { products = [], taxonomy } = await res.json();
  const categories = (taxonomy?.categories || []).filter(c => c.active !== false && c.path);
  for (const c of categories) add(`/${c.path}`, "0.8");
  for (const b of (taxonomy?.brands || []).filter(b => b.active !== false && b.path)) {
    for (const c of categories.filter(c => b.categoryIds?.includes(c.id))) add(`/${c.path}/${b.path}`, "0.6");
  }
  for (const p of products) add(`/producto/${encodeURIComponent(p.id)}`, "0.7", p.updatedAt?.slice(0, 10));
} catch (e) {
  console.warn(`Aviso: no se pudo leer el catálogo (${e.message}). El sitemap solo tendrá las páginas fijas.`);
}

const esc = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...urls].map(([path, { priority, lastmod }]) => `  <url><loc>${esc(SITE + path)}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ""}<priority>${priority}</priority></url>`).join("\n")}
</urlset>
`;
await writeFile(OUT, xml);
console.log(`Sitemap: ${urls.size} páginas → ${OUT}`);
