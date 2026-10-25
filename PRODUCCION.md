# Cuccioli en producción

Estado de los 10 puntos y lo que falta hacer fuera del código (en Cloudflare, Firebase, GitHub y Google).

| # | Punto | Estado | Dónde vive |
|---|---|---|---|
| 1 | Frontend minificado, sin source maps | ✅ | `vite.firebase.config.ts` + `scripts/verificar-bundle.mjs` (el deploy falla si aparece un `.map` o algo que parezca una llave) |
| 2 | Acceso a datos por usuario ("RLS") | ✅ equivalente | Ver nota abajo + `firestore.rules` |
| 3 | Control de versiones | ✅ | `package-lock.json`, pruebas antes de publicar, vista previa por PR |
| 4 | Buenas APIs | ✅ | `/api/catalog`, `/api/health`, validación con zod, errores JSON en español, CORS cerrado |
| 5 | Hosting y deployment | ✅ | Firebase Hosting (frontend) + Cloudflare Workers Builds (API) |
| 6 | Seguridad | ✅ / 🟡 CSP en prueba | `firebase.json`, `server/security.ts` |
| 7 | Rate limiting | ✅ | Limitador nativo de Cloudflare (`vite.config.ts`) + límite de login en D1 |
| 8 | Caché | ✅ | Catálogo: caché en el Worker (20 s) + ETag + `max-age=15`; assets inmutables 1 año |
| 9 | Escalabilidad | ✅ | Ver números abajo |
| 10 | Monitoreo | ✅ | Workers Logs, `/api/health`, errores del navegador → logs, `monitoreo.yml` cada 30 min |

## Notas importantes

**Sobre RLS.** D1 es SQLite y no tiene Row Level Security. Tampoco la necesita: el navegador nunca habla
con la base de datos, solo con la API. La API es el candado: lo público solo devuelve productos visibles
(nunca hashes, sesiones ni intentos de login) y todo lo que escribe exige una sesión del panel válida y
el origen correcto. Hay un solo administrador, así que no existe "datos de otros usuarios" que separar.
El único riesgo real era Firestore: si la base existe en el proyecto de Firebase con reglas abiertas,
cualquiera podría leerla. `firestore.rules` la cierra por completo.

**Escalabilidad (1,000 personas con el catálogo abierto al mismo tiempo).**
Antes cada visitante pedía el catálogo cada 3.5 s: ~286 solicitudes/s y cada una leía todos los
productos de D1. Ahora es cada 60 s (~17 solicitudes/s) y D1 se lee como máximo una vez cada 20 s por
instancia del Worker, sin importar cuántas personas haya. Un cambio de precio en el panel se ve en el
catálogo en ~1 minuto como máximo.

**Seguridad de la cuenta.** En el plan gratuito de Workers, si se pasan los límites diarios las
solicitudes empiezan a fallar, pero no se cobra nada. Si algún día se cambia al plan pagado, configurar
alertas de uso antes (ver pasos).

## Pasos que tenés que hacer vos (una sola vez)

1. **Firestore:** en la consola de Firebase → Firestore → Reglas, pegar el contenido de `firestore.rules`
   y publicar (o `firebase deploy --only firestore:rules`). Si nunca se creó una base Firestore, no hay nada que hacer.
2. **Cloudflare, después de fusionar:** en el Worker `cuccioli-api` → Settings → Bindings, confirmar que
   aparecen `API_LIMITER` e `IMAGE_LIMITER`. En Observability, confirmar que Workers Logs está activo.
3. **Cloudflare, alertas:** en Notifications, crear alertas por uso del Worker y, si se usa el plan pagado, de facturación.
4. **GitHub:** Settings → Branches → proteger `main`: exigir pull request y que pase el check `revisar`.
   Así nada llega a producción sin pruebas.
5. **Google Search Console:** el sitio ya está verificado. Ir a Sitemaps y enviar `https://cuccioli-sv.web.app/sitemap.xml`.
6. **CSP (en ~1 semana):** la política de contenido está en modo *Report-Only*. Abrir el sitio y el panel
   con la consola del navegador; si no aparecen avisos de "Content-Security-Policy", cambiar en `firebase.json`
   `Content-Security-Policy-Report-Only` por `Content-Security-Policy`.

## Pendientes recomendados (no bloquean el lanzamiento)

- **SEO de productos:** el sitio se dibuja con JavaScript. Google lo procesa, pero cada producto no tiene
  su propio título/descripción/imagen en el HTML, y las vistas previas al compartir en WhatsApp salen genéricas.
  Siguiente paso: pre-renderizar las páginas de producto.
- **Dominio propio** (p. ej. `cuccioli.com.sv` o similar) en Cloudflare: mejor marca en Google, caché de borde
  completa y reglas de firewall que no existen en `workers.dev`.
- **Lint:** quedan 17 errores previos (sobre todo `any`). Corregirlos y luego agregar `npm run lint` al CI.
- **Respaldo de D1:** Cloudflare guarda un historial limitado (Time Travel: menos días en el plan gratuito); exportar una copia mensual con
  `wrangler d1 export cuccioli-db --remote --output respaldo.sql` como seguro extra.
