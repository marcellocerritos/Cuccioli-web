export type PetType = string;
export type Variant = { id: string; size: string; price: number; promoPrice: number; active: boolean };
export type Product = { id: string; brand: string; brandId?: string; subBrand: string; subBrandId?: string; petType: PetType; name: string; description: string; specifications: string; imageUrl: string; variants: Variant[]; isOnPromotion: boolean; promotionEndDate: string | null; active: boolean; order: number; createdAt: string; updatedAt?: string };
export type Settings = { businessName: string; tagline: string; whatsappNumber: string; businessDescription: string };
export const categories: { type: PetType; path: string; title: string; short: string; description: string; brands: string[] }[] = [
  { type: "dog", path: "perros", title: "Comida para perros", short: "Para perros", description: "Nutrición para cada etapa de su vida", brands: ["Purina", "Royal Canin", "NutriSource / Pure Vita", "Nupec", "Summit 10", "Monello", "Pedigree", "Dogui", "Sportmix", "Eukanuba", "Advance", "Katu"] },
  { type: "cat", path: "gatos", title: "Comida para gatos", short: "Para gatos", description: "Para los consentidos de la casa", brands: ["Purina", "Royal Canin", "NutriSource / Pure Vita", "Katu"] },
  { type: "litter", path: "arena", title: "Arena para gatos", short: "Arena para gatos", description: "Su espacio, siempre limpio", brands: ["Neo Clean", "Odourlock", "Tidy Cats", "Van Cat", "Easy Clean"] },
  { type: "medicine", path: "medicamentos", title: "Medicamentos", short: "Medicamentos", description: "Cuidado que los acompaña", brands: ["Ferox"] },
];
export const slug = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
export const defaultSettings: Settings = { businessName: "Cuccioli", tagline: "Comida Premium Directo a tu Puerta", whatsappNumber: "50300000000", businessDescription: "Alimento y cuidado para los que hacen tu vida más feliz. Tus marcas favoritas, con entrega a domicilio en El Salvador." };
export const money = (n: number) => new Intl.NumberFormat("es-SV", { style: "currency", currency: "USD" }).format(n);
export function promotionActive(p: Product, now = Date.now()) { return p.isOnPromotion && (!p.promotionEndDate || new Date(p.promotionEndDate).getTime() >= now); }
export function variantPrice(p: Product, v: Variant) { return promotionActive(p) && v.promoPrice > 0 ? v.promoPrice : v.price; }
export function whatsappUrl(number: string, p?: Product, v?: Variant) {
  if (!/^[1-9]\d{7,14}$/.test(number) || /^5030+$/.test(number)) return null;
  const price = p && v ? variantPrice(p, v) : 0;
  const message = p && v ? `¡Hola! Me interesa: ${p.name} - ${v.size}${price > 0 ? ` a ${money(price)}` : ". Quisiera consultar el precio"}.` : "¡Hola, Cuccioli! Quisiera información sobre sus productos y entrega a domicilio.";
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
type SeedRow = [PetType, string, string, string, string[]];
const rows: SeedRow[] = [
  ["dog","Purina","Pro Plan","Adulto con pollo",["3 kg","7.5 kg","15 kg"]],
  ["dog","Purina","Pro Plan","Cachorro",["3 kg","7.5 kg"]],
  ["dog","Purina","Pro Plan","Adulto mayor",["3 kg","7.5 kg"]],
  ["dog","Purina","Dog Chow","Adultos medianos y grandes",["4 kg","17 kg"]],
  ["dog","Purina","Dog Chow","Cachorros",["4 kg","17 kg"]],
  ["cat","Purina","Cat Chow","Adultos",["1.5 kg","3 kg"]],
  ["cat","Purina","Cat Chow","Gatitos",["1.5 kg","3 kg"]],
  ["dog","Royal Canin","","Medium Adult",["4 kg","15 kg"]],
  ["cat","Royal Canin","","Kitten",["2 kg","4 kg"]],
  ["dog","Royal Canin","","Giant Adult",["15 kg"]],
  ["dog","Pedigree","","Adultos",["4 kg","21 kg"]],
  ["dog","Pedigree","","Cachorros",["4 kg","8 kg"]],
  ["dog","Monello","","Adultos",["8 kg","15 kg"]],
  ["dog","Monello","","Cachorros",["7 kg","15 kg"]],
  ["dog","Nupec","","Adulto",["2 kg","8 kg"]],
  ["dog","Nupec","","Cachorro",["2 kg","8 kg"]],
  ["dog","Purina","Alpo","Adultos",["Consultar presentación"]],
  ["dog","Purina","Beneful","Adultos",["Consultar presentación"]],
  ["dog","Purina","ONE","Adultos",["Consultar presentación"]],
  ["cat","Purina","Pro Plan Cat","Adultos",["1 kg","3 kg"]],
  ["dog","NutriSource / Pure Vita","NutriSource","Adultos",["Consultar presentación"]],
  ["dog","NutriSource / Pure Vita","Pure Vita","Adultos",["Consultar presentación"]],
  ["cat","NutriSource / Pure Vita","NutriSource","Gatos adultos",["Consultar presentación"]],
  ["cat","NutriSource / Pure Vita","Pure Vita","Gatos adultos",["Consultar presentación"]],
  ["dog","Summit 10","","Adultos",["Consultar presentación"]],
  ["dog","Dogui","","Adultos",["Consultar presentación"]],
  ["dog","Sportmix","","Adultos",["Consultar presentación"]],
  ["dog","Eukanuba","","Adultos",["Consultar presentación"]],
  ["dog","Advance","","Adultos",["Consultar presentación"]],
  ["dog","Katu","","Perros adultos",["Consultar presentación"]],
  ["cat","Katu","","Gatos adultos",["Consultar presentación"]],
  ["litter","Neo Clean","","Arena para gatos",["Consultar presentación"]],
  ["litter","Tidy Cats","","Arena para gatos",["Consultar presentación"]],
  ["litter","Odourlock","","Arena para gatos",["Consultar presentación"]],
  ["litter","Van Cat","","Arena para gatos",["Consultar presentación"]],
  ["litter","Easy Clean","","Arena para gatos",["Consultar presentación"]],
  ["medicine","Ferox","","Cuidado veterinario",["Consultar presentación"]],
];
export const seedProducts: Product[] = rows.map(([petType, brand, subBrand, title, sizes], index) => ({
  id: `cuccioli-${String(index + 1).padStart(3, "0")}`, brand, subBrand, petType, name: `${subBrand || brand} ${title}`,
  description: petType === "litter" ? "Arena para la higiene diaria de tu gato. Consultá las presentaciones disponibles y elegí la ideal para su espacio." : petType === "medicine" ? "Consultá la presentación y disponibilidad. Utilizá medicamentos únicamente según la indicación de tu veterinario." : `Alimento para ${petType === "dog" ? "perros" : "gatos"} de ${brand}. Consultá la presentación y disponibilidad para tu mascota.`,
  specifications: "", imageUrl: `/placeholders/${slug(brand)}.svg`, variants: sizes.map((size, i) => ({ id: `v${i + 1}`, size, price: 0, promoPrice: 0, active: true })),
  isOnPromotion: false, promotionEndDate: null, active: true, order: index, createdAt: "2026-09-08T00:00:00.000Z",
}));
