import type { Product } from "./catalog";
import type { Taxonomy } from "./taxonomy";
const normalize = (value: string) => value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es");
export function matchesSearch(product: Product, query: string, taxonomy: Taxonomy) {
  const category = taxonomy.categories.find(c => c.id === product.petType);
  const text = normalize([product.name, product.brand, product.subBrand, product.description, category?.title, category?.short, ...product.variants.filter(v => v.active).map(v => v.size)].filter(Boolean).join(" "));
  return normalize(query).trim().split(/\s+/).every(term => text.includes(term));
}
