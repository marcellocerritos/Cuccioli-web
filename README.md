# Cuccioli

Catálogo web para el negocio familiar de mi papá, dedicado a la venta y entrega a domicilio de productos para mascotas en El Salvador.

**Sitio publicado:** https://cuccioli-sv.web.app

## El problema que quería resolver

Antes de este proyecto, gran parte de la información de los productos estaba concentrada en WhatsApp. Si un cliente quería saber qué marcas había, qué presentaciones estaban disponibles o cuánto costaba algo, muchas veces tenía que preguntar directamente.

Eso generaba dos problemas.

Por un lado, el cliente tenía más fricción antes de comprar. En supermercados grandes podía consultar un precio inmediatamente, mientras que aquí tenía que iniciar una conversación solo para obtener información básica, aun cuando el negocio podía ofrecer precios competitivos al comprar directamente a distribuidores y casas matrices.

Por otro lado, crear un catálogo tradicional tampoco resolvía todo. Los precios cambian, aparecen promociones, entran nuevas presentaciones y el catálogo necesita mantenimiento constante. Mi papá no tiene experiencia trabajando con bases de datos ni herramientas técnicas, así que no tenía sentido construir una solución que después dependiera de que él aprendiera a editar tablas, archivos o código.

Ese terminó siendo el reto que más me interesó del proyecto:

> **No solo necesitaba guardar los datos. Necesitaba hacer que administrar esos datos fuera suficientemente simple para alguien sin experiencia técnica.**

## Cómo lo abordé

Mi primera idea era hacer dos sitios separados: uno para clientes y otro para administración.

Después simplifiqué la arquitectura. En lugar de duplicar aplicaciones, planteé una sola solución con dos experiencias diferentes:

- el **catálogo público**, pensado para clientes;
- el **panel administrativo**, pensado para el propietario del negocio.

Para mi papá, la base de datos no se presenta como una base de datos. Se presenta como formularios, botones, campos de precio, switches para promociones y herramientas para agregar o modificar productos.

Por ejemplo, para cambiar un precio no necesita buscar una fila en una tabla técnica. Entra al panel, busca el producto, cambia el valor y guarda. El catálogo público obtiene después ese mismo dato desde la fuente central.

La misma lógica se aplica a:

- productos;
- marcas;
- categorías;
- presentaciones;
- precios;
- promociones;
- imágenes;
- información general del negocio.

De esa forma, la interfaz administrativa funciona como una **capa simple sobre la base de datos**.

## Decisión de diseño principal

```text
                 ┌────────────────────┐
                 │   Base de datos    │
                 │       D1           │
                 └─────────┬──────────┘
                           │
                        API
                           │
             ┌─────────────┴─────────────┐
             │                           │
             ▼                           ▼
     Catálogo público             Panel administrativo
       para clientes               para el propietario
             │                           │
     consultar productos         editar productos
     precios y promociones       precios y promociones
     comprar por WhatsApp        sin tocar código
```

Esto también evita mantener dos copias distintas de la información. El cliente y el administrador trabajan, desde interfaces distintas, sobre el mismo origen de datos.

## Qué terminó incluyendo

### Para clientes

- catálogo organizado por categorías, marcas y productos;
- búsqueda;
- presentaciones y precios;
- promociones;
- navegación responsive;
- acceso directo a WhatsApp para consultar o pedir un producto.

### Para administración

- inicio de sesión;
- alta y edición de productos;
- administración de marcas y categorías;
- modificación de precios y presentaciones;
- activación y edición de promociones;
- carga de imágenes;
- configuración general del negocio;
- cambio de contraseña;
- actualización del catálogo sin tener que modificar ni volver a escribir el código.

## Arquitectura actual

El frontend público se publica mediante Firebase Hosting.

Las operaciones dinámicas pasan por la API de Cuccioli. En el despliegue actual:

- **D1** almacena productos, marcas, categorías, configuración y datos de administración;
- **R2** almacena las imágenes subidas desde el panel;
- **Cloudflare Workers** ejecuta la lógica del servidor;
- **React + TypeScript** construyen la interfaz;
- **Firebase Hosting** sirve el frontend público.

```text
Firebase Hosting
       │
       ▼
Frontend React
       │
       ▼
API de Cuccioli
   │         │
   ▼         ▼
  D1        R2
 datos    imágenes
```

El proyecto conserva una capa de compatibilidad con una etapa anterior basada en Firestore. Esa ruta únicamente se activa si se configuran de forma explícita las variables correspondientes. **El despliegue actual no necesita una clave privada de Firebase para funcionar.**

Hay más detalle en [ARCHITECTURE.md](ARCHITECTURE.md).

## Lo que aprendí del proyecto

La parte más útil de Cuccioli no fue solamente construir una página web. Fue aprender a convertir una necesidad bastante cotidiana en decisiones concretas de implementación.

Algunas de las preguntas que tuve que resolver fueron:

- ¿cómo organizar un catálogo que tiene marcas, submarcas, productos y varias presentaciones?;
- ¿cómo evitar que el propietario tenga que depender de un desarrollador para cambiar un precio?;
- ¿cómo hacer que las promociones sean fáciles de activar y desactivar?;
- ¿cómo mantener una única fuente de información para clientes y administrador?;
- ¿cómo diseñar el panel pensando en alguien que no está acostumbrado a trabajar con software administrativo?;
- ¿cómo separar los secretos y credenciales del código que puede publicarse en GitHub?

Ese enfoque fue cambiando el proyecto de “hacer una página con productos” a construir una herramienta que el negocio pudiera mantener en el día a día.

## Tecnologías

- React
- TypeScript
- React Router
- Tailwind CSS
- Vite / Vinext
- Cloudflare Workers
- Cloudflare D1
- Cloudflare R2
- Firebase Hosting

## Ejecutarlo localmente

```bash
npm install
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

Este repositorio no contiene contraseñas reales, cuentas de servicio ni claves privadas.

Los archivos de entorno y credenciales están excluidos mediante `.gitignore`, incluyendo:

- `.env`;
- `.dev.vars`;
- claves privadas;
- archivos de cuentas de servicio;
- credenciales de Firebase/Google.

La configuración pública del cliente de Firebase que pueda permanecer por compatibilidad no equivale a una cuenta de servicio.

## Sobre mi trabajo

Cuccioli nació de una necesidad real del negocio de mi papá.

Yo fui convirtiendo esa necesidad en requisitos y después en decisiones de producto y arquitectura: estructura del catálogo, administración de productos, organización por marcas y categorías, promociones, flujo hacia WhatsApp y, especialmente, una forma de mantenimiento que no exigiera conocimientos técnicos al propietario.

Utilicé herramientas de IA durante el desarrollo para acelerar investigación, implementación y revisión. La definición del problema, las decisiones funcionales y las iteraciones del sistema se hicieron alrededor de cómo iba a utilizarse realmente en el negocio.

## Nota sobre assets

La versión pública del repositorio no incluye el catálogo histórico de importaciones ni la colección completa de imágenes comerciales de productos. Esos archivos no son necesarios para entender la arquitectura y algunos pertenecen a marcas o proveedores externos.
