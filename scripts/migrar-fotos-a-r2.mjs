#!/usr/bin/env node
// Mueve las fotos del catálogo que viven como archivos estáticos (/catalog-images/...)
// al almacenamiento del backend (Cloudflare R2), igual que las fotos que se suben desde el panel.
// Después de esto, ninguna publicación del frontend puede volver a borrar fotos.
//
// Uso (en tu PC, desde la carpeta del repo):
//   node scripts/migrar-fotos-a-r2.mjs "C:\ruta\a\public\catalog-images"            -> simulación, no cambia nada
//   node scripts/migrar-fotos-a-r2.mjs "C:\ruta\a\public\catalog-images" --aplicar  -> migra de verdad
//
// Usa solo los mismos endpoints que el panel de administración (login, data, upload, products).
// Es seguro repetirlo: los productos que ya apuntan a /api/images/ se saltan.

import { readFile, writeFile, access } from "node:fs/promises";
import path from "node:path";
import readline from "node:readline";

const API = process.env.CUCCIOLI_API || "https://cuccioli-api.m-cerritosal32007.workers.dev";
const ORIGIN = "https://cuccioli-sv.web.app";
const PREFIX = "/catalog-images/";
const TIPOS = { ".webp": "image/webp", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg" };

const carpeta = process.argv[2];
const aplicar = process.argv.includes("--aplicar");
if (!carpeta || carpeta.startsWith("--")) {
  console.error('Falta la carpeta. Ejemplo: node scripts/migrar-fotos-a-r2.mjs "C:\\...\\public\\catalog-images"');
  process.exit(1);
}

function pedirContrasena() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl._writeToOutput = (s) => { if (s.includes("Contraseña")) rl.output.write(s); };
    rl.question("Contraseña del panel de administración: ", (r) => { rl.close(); process.stdout.write("\n"); resolve(r); });
  });
}

let token = "";
async function api(ruta, metodo = "GET", cuerpo, tipo) {
  const headers = { Origin: ORIGIN };
  if (token) headers.Authorization = `Bearer ${token}`;
  let body;
  if (cuerpo instanceof Uint8Array) { body = cuerpo; headers["Content-Type"] = tipo; }
  else if (cuerpo !== undefined) { body = JSON.stringify(cuerpo); headers["Content-Type"] = "application/json"; }
  const res = await fetch(API + ruta, { method: metodo, headers, body });
  const texto = await res.text();
  let datos; try { datos = JSON.parse(texto); } catch { datos = { error: texto.slice(0, 200) }; }
  if (!res.ok) throw new Error(`${metodo} ${ruta} -> ${res.status}: ${datos.error || datos.message || texto.slice(0, 200)}`);
  return datos;
}

const existe = (p) => access(p).then(() => true, () => false);

async function main() {
  const login = await api("/api/admin/login", "POST", { password: await pedirContrasena() });
  token = login.token;
  if (!token) throw new Error("El login no devolvió token. Revisá que el backend tenga CUCCIOLI_PUBLIC_ORIGIN configurado.");

  const { products } = await api("/api/admin/data");
  const pendientes = products.filter((p) => typeof p.imageUrl === "string" && p.imageUrl.startsWith(PREFIX));
  console.log(`Productos: ${products.length}. Con foto estática (${PREFIX}): ${pendientes.length}.`);
  if (!pendientes.length) { console.log("No hay nada que migrar."); return; }

  // Verificar TODO antes de tocar nada.
  const faltan = [];
  for (const p of pendientes) {
    const archivo = path.join(carpeta, p.imageUrl.slice(PREFIX.length));
    if (!(await existe(archivo)) || !TIPOS[path.extname(archivo).toLowerCase()]) faltan.push(`${p.id}: ${archivo}`);
  }
  if (faltan.length) {
    console.error(`\nFaltan ${faltan.length} archivos en la carpeta. No se cambió nada:\n` + faltan.join("\n"));
    process.exit(2);
  }
  console.log("Todos los archivos existen en la carpeta.");
  if (!aplicar) { console.log("\nSimulación terminada. Para migrar de verdad, repetí el comando con --aplicar."); return; }

  const registro = [];
  const archivoRegistro = `migracion-fotos-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  let n = 0;
  for (const p of pendientes) {
    const archivo = path.join(carpeta, p.imageUrl.slice(PREFIX.length));
    const bytes = new Uint8Array(await readFile(archivo));
    const { imageUrl } = await api("/api/admin/upload", "POST", bytes, TIPOS[path.extname(archivo).toLowerCase()]);
    await api("/api/admin/products", "PUT", { ...p, imageUrl });
    registro.push({ id: p.id, antes: p.imageUrl, despues: imageUrl });
    await writeFile(archivoRegistro, JSON.stringify(registro, null, 2)); // se guarda en cada paso por si algo se corta
    console.log(`[${++n}/${pendientes.length}] ${p.id} -> ${imageUrl}`);
  }

  // Comprobación final: cada foto nueva responde como imagen.
  let malas = 0;
  for (const r of registro) {
    const res = await fetch(API + r.despues);
    if (!res.ok || !(res.headers.get("content-type") || "").startsWith("image/")) { malas++; console.error(`No responde bien: ${r.id} ${r.despues}`); }
  }
  console.log(`\nListo. ${registro.length} fotos migradas, ${malas} con problemas. Registro: ${archivoRegistro}`);
  if (malas) process.exit(3);
}

main().catch((e) => { console.error("\nError:", e.message); process.exit(1); });
