import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  root: `${root}hosting`,
  publicDir: `${root}public`,
  plugins: [react()],
  resolve: { alias: { "@": root } },
  define: { __CUCCIOLI_API_ORIGIN__: JSON.stringify("https://cuccioli-api.m-cerritosal32007.workers.dev") },
  // Producción: código minificado y SIN source maps (nadie puede reconstruir el código original).
  // El CI falla si aparece cualquier .map en firebase-dist.
  build: { outDir: `${root}firebase-dist`, emptyOutDir: true, sourcemap: false, minify: true },
});
