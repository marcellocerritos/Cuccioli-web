# Cuccioli

Catálogo web para un negocio familiar de productos para mascotas en El Salvador.

Lo empecé para resolver un problema bastante simple: tener productos, marcas, presentaciones y precios organizados en una web que pudiera actualizarse sin tener que tocar el código cada vez. El sitio también permite llevar un producto directamente a WhatsApp para hacer el pedido.

**Sitio publicado:** https://cuccioli-sv.web.app

## Qué incluye

- catálogo por categorías, marcas y productos;
- búsqueda y navegación responsive;
- presentaciones y precios por producto;
- promociones;
- pedidos por WhatsApp;
- panel administrativo para productos, marcas, categorías y ajustes;
- cambio de contraseña y sesiones de administración;
- carga de imágenes desde el panel;
- actualización periódica del catálogo sin volver a publicar el frontend.

## Tecnologías

- React + TypeScript
- React Router
- Tailwind CSS
- Vite / Vinext
- Cloudflare Workers
- D1 para datos del catálogo y configuración
- R2 para imágenes cargadas desde el panel
- Firebase Hosting para el frontend público

## Arquitectura actual

La versión pública en `cuccioli-sv.web.app` es un frontend estático. Las operaciones del catálogo y del panel administrativo pasan por la API del servidor de Cuccioli.

En el despliegue actual, el servidor usa **D1** para los datos y **R2** para las imágenes. La contraseña de administración y cualquier otra variable privada se configuran en el entorno de ejecución y no forman parte de este repositorio.

El código conserva una capa de compatibilidad de una etapa anterior basada en Firestore. Esa ruta solo se activa si se configuran explícitamente variables de Firebase en el servidor; **el despliegue actual no necesita una clave privada de Firebase para funcionar**.

## Ejecutarlo localmente

```bash
npm ci
cp .env.example .dev.vars
npm run dev
```

Antes del primer arranque local, cambia `CAMBIAR_ESTO` en `.dev.vars` por una contraseña propia.

Pruebas:

```bash
npm test
```

Build:

```bash
npm run build
```

## Seguridad

Este repositorio no contiene contraseñas reales, cuentas de servicio ni claves privadas. Los archivos `.env`, `.dev.vars` y credenciales de Firebase/Google están excluidos explícitamente en `.gitignore`.

La configuración pública del cliente de Firebase que pueda permanecer por compatibilidad no equivale a una cuenta de servicio. Las credenciales administrativas nunca deben incluirse en el frontend ni en GitHub.

## Sobre el proyecto

Cuccioli es un proyecto real para un negocio familiar, no una plantilla. Fui traduciendo necesidades del negocio a requisitos concretos: cómo agrupar productos y presentaciones, cómo administrar marcas y categorías, cómo mostrar promociones y cómo hacer que el propietario pudiera mantener el catálogo sin depender de cambios manuales en el código.

Usé herramientas de IA durante el desarrollo para acelerar investigación, implementación y revisión. Las decisiones funcionales y la validación del comportamiento del sitio se hicieron sobre las necesidades reales del negocio.

## Nota sobre assets

La versión pública del repositorio no incluye el catálogo histórico de importaciones ni la colección completa de imágenes comerciales de productos. Esos archivos no son necesarios para entender el código y algunos pertenecen a marcas/proveedores externos.
