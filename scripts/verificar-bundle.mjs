#!/usr/bin/env node
// Guardia de publicación: el frontend público no debe llevar source maps ni nada que parezca una llave.
// Falla el deploy si encuentra cualquiera de las dos cosas en firebase-dist/.

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const DIST = "firebase-dist";
const SECRET_PATTERNS = [
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, "llave privada"],
  [/"private_key"\s*:/, "cuenta de servicio de Google"],
  [/sk_live_[0-9a-zA-Z]{10,}/, "llave secreta de Stripe"],
  [/CUCCIOLI_ADMIN_PASSWORD/, "variable de contraseña del panel"],
  [/(?:ghp|github_pat)_[0-9A-Za-z_]{20,}/, "token de GitHub"],
];

const files = [];
async function walk(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) await walk(p); else files.push(p);
  }
}
await walk(DIST);

const problemas = [];
for (const f of files) {
  if (f.endsWith(".map")) { problemas.push(`${f}: source map publicado`); continue; }
  if (!/\.(js|css|html|json|txt|xml)$/.test(f)) continue;
  const text = await readFile(f, "utf8");
  if (/sourceMappingURL=/.test(text)) problemas.push(`${f}: referencia a source map`);
  for (const [re, label] of SECRET_PATTERNS) if (re.test(text)) problemas.push(`${f}: parece contener ${label}`);
}

if (problemas.length) {
  console.error(`\nEl build no es seguro para publicar:\n${problemas.join("\n")}`);
  process.exit(1);
}
console.log(`Bundle verificado: ${files.length} archivos, sin source maps ni secretos.`);
