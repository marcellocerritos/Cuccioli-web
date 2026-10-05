# Arquitectura actual

```text
Firebase Hosting
   │
   │ frontend React
   ▼
API de Cuccioli
   │
   ├── D1 → productos, marcas, categorías, configuración y sesiones
   └── R2 → imágenes cargadas desde el panel
```

## Datos

El servidor usa una abstracción en `server/store.ts`. En el despliegue actual, al no configurarse las variables de Firebase del servidor, las operaciones se resuelven contra D1.

La estructura de D1 es intencionalmente pequeña: una tabla de registros almacena documentos por `collection`, `id` y `value`.

## Imágenes

Las imágenes subidas desde el panel administrativo se guardan en R2 y se sirven a través de `/api/images/...`.

## Frontend público

El frontend de `cuccioli-sv.web.app` se publica como sitio estático en Firebase Hosting y consume la API pública de Cuccioli.

## Compatibilidad histórica

El proyecto conserva una capa de compatibilidad con una etapa anterior basada en Firestore. Esa ruta solo se activa si se configuran explícitamente las variables correspondientes. No es el almacenamiento principal del despliegue actual.
