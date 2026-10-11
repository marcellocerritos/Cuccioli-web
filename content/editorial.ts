// Fotos editoriales (public/editorial/, créditos en public/editorial/CREDITOS.md).
// Regla: cada foto aparece una sola vez en el sitio; el hero (cuccioli-hero.webp) solo en el hero.
// Si una clave no está registrada, la sección usa su composición de respaldo.
export type EditorialKey =
  | "audience" | "step1" | "step2" | "step3" | "compare" | "closing" | "menu"
  | "finderPara" | "finderEtapa" | "finderTamano" | "finderMarca"
  | "catalog" | "promotions"
  | "category-dog" | "category-cat" | "category-litter" | "category-medicine" | "category-care";
export type EditorialPhoto = { src: string; alt: string; width: number; height: number; position?: string };

export const editorialPhotos: Partial<Record<EditorialKey, EditorialPhoto>> = {
  audience: { src: "/editorial/inicio-para-quien.webp", alt: "Un perro y un gato naranja duermen juntos sobre una manta", width: 1600, height: 1064, position: "50% 55%" },
  step1: { src: "/editorial/inicio-paso-1.webp", alt: "Una perra echada junto a su plato de comida en la sala", width: 1600, height: 1067, position: "62% 60%" },
  step2: { src: "/editorial/inicio-paso-2.webp", alt: "Una mano sostiene un celular mientras fotografía a un perro", width: 1200, height: 1600, position: "50% 40%" },
  step3: { src: "/editorial/inicio-paso-3.webp", alt: "Un perro blanco se asoma por la puerta de su casa", width: 1226, height: 1600, position: "45% 55%" },
  compare: { src: "/editorial/inicio-comparacion.webp", alt: "Un corgi duerme cómodo en el sofá", width: 1357, height: 1600, position: "50% 50%" },
  closing: { src: "/editorial/inicio-cierre.webp", alt: "Un cachorro golden descansa con la barbilla en el piso", width: 1600, height: 1067, position: "50% 45%" },
  menu: { src: "/editorial/menu.webp", alt: "Un gato atigrado se estira al sol frente a una ventana", width: 1600, height: 1067, position: "40% 60%" },
  finderPara: { src: "/editorial/buscador-para-quien.webp", alt: "Un gato gris tumbado en el piso alza la pata para tocar a un perro beige", width: 1143, height: 1600, position: "40% 68%" },
  finderEtapa: { src: "/editorial/buscador-etapa.webp", alt: "Un labrador senior de hocico canoso descansa en la alfombra", width: 1600, height: 1052, position: "45% 50%" },
  finderTamano: { src: "/editorial/buscador-tamano.webp", alt: "Un perrito blanco junto a un golden retriever", width: 1600, height: 1063, position: "55% 55%" },
  finderMarca: { src: "/editorial/buscador-marca.webp", alt: "Un gatito naranja juega en la cama", width: 1600, height: 1067, position: "48% 50%" },
  catalog: { src: "/editorial/catalogo.webp", alt: "Un perro descansa en el piso de una sala soleada", width: 1600, height: 694, position: "72% 60%" },
  promotions: { src: "/editorial/promociones.webp", alt: "Un corgi corre feliz por el pasto", width: 1600, height: 1067, position: "50% 45%" },
  "category-dog": { src: "/editorial/categoria-perros.webp", alt: "Un terrier de perfil iluminado por el sol de la tarde", width: 1600, height: 1201, position: "45% 40%" },
  "category-cat": { src: "/editorial/categoria-gatos.webp", alt: "Un gato naranja sentado al sol sobre un piso de madera", width: 1600, height: 1067, position: "72% 50%" },
  "category-litter": { src: "/editorial/categoria-arena.webp", alt: "Un gato atigrado sentado sobre una cama blanca en un cuarto luminoso", width: 1067, height: 1600, position: "50% 60%" },
  "category-medicine": { src: "/editorial/categoria-salud.webp", alt: "Un chihuahua tranquilo durante su consulta veterinaria", width: 1067, height: 1600, position: "50% 38%" },
  "category-care": { src: "/editorial/categoria-higiene.webp", alt: "Un pomerania con una toalla rosa mientras lo cepillan", width: 1600, height: 1067, position: "40% 35%" },
};

export const categoryPhotoKey = (categoryId: string) => `category-${categoryId}` as EditorialKey;
