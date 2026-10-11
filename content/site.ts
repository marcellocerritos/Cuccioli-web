// Textos del sitio público (rediseño v2). Español salvadoreño con voseo.
// Los marcados "existente" vienen del sitio anterior y se conservan tal cual.

export const site = {
  announcement: { text: "Entrega a domicilio en El Salvador", cta: "Pedí por WhatsApp" },
  skip: "Ir al contenido", // existente
  loading: "Cargando tu tienda…", // existente

  header: {
    shop: "Tienda",
    finder: "Encontrá su comida",
    search: "Buscar",
    order: "Mi pedido",
    openMenu: "Abrir menú",
    closeMenu: "Cerrar menú",
    home: "Cuccioli, inicio",
  },

  menu: {
    title: "Tienda",
    seeAll: "Ver todo",
    promotions: "Promociones",
    finderLead: "¿No sabés cuál elegir?",
    finder: "Encontrá su comida",
    whatsapp: "Escribinos por WhatsApp",
    close: "Cerrar",
    brandsOf: "Marcas en",
  },

  search: {
    title: "Buscar en Cuccioli",
    label: "Buscar productos, marcas o categorías", // existente
    placeholder: "Buscar productos, marcas o categorías…", // existente
    submit: "Buscar", // existente
    browse: "O explorá por categoría",
    close: "Cerrar búsqueda",
  },

  hero: {
    // Si el tagline guardado es el de fábrica, se usa este titular (existente).
    defaultTitle: "Comida premium directo a tu puerta.",
    subtitle: "Las marcas que ya conocés, con entrega a domicilio en El Salvador. Elegís, nos escribís y te lo llevamos.",
    cta: "Ver la tienda",
    secondary: "Encontrá su comida",
    imageAlt: "Un Jack Russell sentado junto a un gato atigrado que descansa en el piso de casa",
  },

  audience: {
    title: "¿Para quién es?",
    lead: "Contanos quién te espera en casa y te mostramos lo suyo.",
    dogs: "Perros",
    cats: "Gatos",
    more: "Y también",
    options: {
      puppy: "Cachorro",
      adultDog: "Perro adulto",
      seniorDog: "Perro senior",
      kitten: "Gatito",
      adultCat: "Gato adulto",
    },
  },

  categories: {
    title: "Todo lo que necesitan.",
    products: (n: number) => `${n} ${n === 1 ? "producto" : "productos"}`,
    seeAll: "Ver todo",
  },

  figures: {
    title: "En números",
    products: "productos en el catálogo",
    brands: "marcas",
    message: "mensaje para pedir",
    note: "Conteo del catálogo de hoy; se actualiza solo.",
  },

  steps: {
    title: "Así de fácil.",
    items: [
      { title: "Elegí su comida", text: "Por categoría, por marca o con el buscador guiado." },
      { title: "Pedí por WhatsApp", text: "Armá tu pedido y mandalo en un solo mensaje." },
      { title: "La recibís en casa", text: "Te lo llevamos a domicilio en El Salvador." },
    ],
  },

  marquee: { label: "Marcas que encontrás en Cuccioli" },

  promotions: {
    eyebrow: "Más cariño, mejor precio", // existente
    title: "Sus favoritos, en promoción", // existente
    link: "Ver promociones", // existente
    emptyTitle: "Las buenas noticias también mueven colitas.", // existente
    emptyText: "Pronto encontrarás aquí nuestras próximas promociones.", // existente
  },

  compare: {
    title: "Con Cuccioli / Como siempre",
    ours: "Con Cuccioli",
    theirs: "Como siempre",
    rows: [
      { ours: "Te lo llevamos a domicilio", theirs: "Cargar el saco de 25 kg hasta la casa" },
      { ours: "Todo en un mensaje", theirs: "Buscar en varias tiendas" },
      { ours: "Alimento, arena, salud e higiene en un solo lugar", theirs: "Una tienda para cada cosa" },
      { ours: "Precios a la vista en el catálogo", theirs: "Preguntar precio por precio" },
      { ours: "Te ayudamos a elegir por WhatsApp", theirs: "Adivinar frente al estante" },
    ],
  },

  closing: {
    title: "¿No sabés cuál elegir?",
    text: "Respondé cuatro preguntas y te mostramos opciones. O escribinos y lo vemos juntos.",
    finder: "Encontrá su comida",
    whatsapp: "Escribinos por WhatsApp",
  },

  footer: {
    shop: "Tienda",
    help: "Ayuda",
    contact: "Contacto",
    finder: "Encontrá su comida",
    howTo: "Cómo pedir",
    promotions: "Promociones",
    country: "El Salvador", // existente
    delivery: "Entrega a domicilio",
    whatsappSoon: "WhatsApp próximamente", // existente
    madeWith: "Hecho con amor por las mascotas.", // existente
  },

  mobileBar: { order: "Mi pedido", whatsapp: "WhatsApp" },

  whatsappSoon: {
    title: "El canal de pedidos estará disponible pronto.", // existente
    description: "Estamos preparando nuestro WhatsApp para atenderte.", // existente
  },

  card: {
    from: "desde",
    consult: "Consultar precio", // existente
    presentations: (n: number) => `${n} ${n === 1 ? "presentación" : "presentaciones"}`,
    promo: "En promoción",
    add: "Agregar",
    added: "Agregado a tu pedido",
    choose: "Elegí la presentación",
    closeChoose: "Cerrar selector",
    unavailable: "Sin presentaciones disponibles", // existente
  },

  product: {
    presentation: "Presentación",
    quantity: "Cantidad",
    add: "Agregar a mi pedido",
    single: "Pedir solo este por WhatsApp",
    description: "Descripción",
    specifications: "Información del producto", // existente
    moreOf: (brand: string) => `Más de ${brand}`,
    decrease: "Quitar uno",
    increase: "Agregar uno",
    currency: "USD", // existente
  },

  order: {
    title: "Mi pedido",
    close: "Cerrar pedido",
    emptyTitle: "Tu pedido está vacío.",
    emptyText: "Agregá productos desde la tienda y mandalo todo en un solo mensaje.",
    subtotal: "Subtotal",
    subtotalNote: "No incluye los productos con precio por consultar.",
    consult: "Precio por consultar",
    remove: "Quitar",
    clear: "Vaciar pedido",
    send: "Enviar pedido por WhatsApp",
    pricesUpdated: "Actualizamos los precios con el catálogo de hoy.",
    removed: (name: string) => `${name} ya no está disponible y lo quitamos.`,
    count: (n: number) => `${n} ${n === 1 ? "producto" : "productos"} en tu pedido`,
    view: "Ver pedido",
    each: (price: string) => `${price} c/u`,
    decrease: "Quitar uno",
    increase: "Agregar uno",
    quantityOf: (name: string) => `Cantidad de ${name}`,
    message: {
      greeting: "¡Hola, Cuccioli! Quiero hacer este pedido:",
      consult: "precio por consultar",
      subtotal: "Subtotal",
      subtotalNote: "sin los productos por consultar",
      closing: "¿Me confirman disponibilidad y entrega?",
    },
  },

  finder: {
    title: "Encontrá su comida",
    step: (n: number, total: number) => `Paso ${n} de ${total}`,
    back: "Atrás",
    restart: "Empezar de nuevo",
    pet: { question: "¿Para quién es?", dog: "Perro", cat: "Gato", shortcuts: "¿Buscás otra cosa?" },
    stage: { question: "¿En qué etapa está?", puppy: "Cachorro", kitten: "Gatito", adult: "Adulto", senior: "Senior", seniorHint: "7 años o más" },
    size: { question: "¿De qué tamaño es?", small: "Pequeño", medium: "Mediano", large: "Grande", unknown: "No sé" },
    brand: { question: "¿Alguna marca preferida?", none: "Sin preferencia" },
    results: "Esto es lo que encontramos",
    fallback: "No hay una coincidencia exacta, pero estas opciones se acercan.",
    reasons: { allStages: "Para todas las etapas", anySize: "Sin tamaño específico", allSizes: "Todos los tamaños", smallBreed: "Raza pequeña", mediumBreed: "Raza mediana", largeBreed: "Raza grande" },
    help: "Ayudame a elegir",
    helpText: {
      greeting: "¡Hola, Cuccioli! ¿Me ayudan a elegir? Busco comida para mi",
      pet: { perro: "perro", gato: "gato" },
      kitten: "gatito",
      stage: { cachorro: "cachorro", adulto: "adulto", senior: "senior" },
      size: (size: string) => `de tamaño ${size}`,
      brand: (brand: string) => `Marca preferida: ${brand}`,
    },
    seeAll: "Ver todo en la tienda",
  },

  catalog: {
    filters: { title: "Filtros", active: "Filtros activos", remove: (label: string) => `Quitar filtro ${label}`, category: "Categoría", brand: "Marca", line: "Línea", stage: "Etapa", all: "Todas", clearAll: "Limpiar todo" },
    stages: { cachorro: "Cachorro", gatito: "Gatito", adulto: "Adulto", senior: "Senior" },
    // existentes
    breadcrumbs: "Ruta de navegación",
    home: "Inicio",
    catalog: "Catálogo",
    title: "Nuestro catálogo",
    kicker: "Todo para tus mascotas",
    text: "Las marcas que les gustan. El cuidado que se merecen.",
    brandText: (brand: string) => `Encontrá sus favoritos de ${brand}.`,
    count: (n: number) => `${n} productos`,
    gridTitle: "Elegí su próximo favorito",
    brandGridTitle: (brand: string) => `Productos ${brand}`,
    promoKicker: "Oportunidades para consentirlos",
    promoTitle: (brand?: string) => `Promociones${brand ? ` ${brand}` : ""}`,
    emptyTitle: "Pronto habrá más por aquí",
    emptyText: "Estamos preparando los productos de esta selección.",
    emptyCta: "Explorar el catálogo",
    errorTitle: "No pudimos cargar los productos",
    errorText: "Reintentá con el botón del aviso de conexión.",
    retry: "Reintentar",
    loading: "Cargando productos",
  },

  // existentes
  searchPage: {
    crumb: "Búsqueda",
    kicker: "Encontrá su favorito",
    title: "Resultados de búsqueda",
    query: "Buscaste:",
    count: (n: number) => `${n} ${n === 1 ? "producto encontrado" : "productos encontrados"}`,
    clear: "Limpiar búsqueda",
    emptyTitle: "No encontramos productos",
    emptyText: "Probá con otro nombre, marca o categoría. También podés consultar por WhatsApp lo que necesitás.",
    whatsapp: "Consultar por WhatsApp",
    all: "Ver todo el catálogo",
  },

  // existentes
  promotionsPage: {
    crumb: "Promociones",
    kicker: "Más para ellos, menos para tu bolsillo",
    title: "Consentilos un poquito más.",
    text: "Las promociones de Cuccioli, todas en un mismo lugar.",
    emptyTitle: "Estamos preparando nuevas promociones",
    emptyText: "Volvé pronto para descubrirlas. Mientras tanto, encontrá sus marcas favoritas en el catálogo.",
    emptyCta: "Explorar catálogo",
  },

  notFound: {
    eyebrow: "Página no encontrada", // existente
    title: "Parece que esta patita se perdió.", // existente
    text: "Volvé al inicio para encontrar lo que tu mascota necesita.", // existente
    cta: "Volver al inicio", // existente
  },
} as const;
