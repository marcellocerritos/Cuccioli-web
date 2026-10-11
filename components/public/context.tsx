"use client";
import { createContext, useContext, useMemo } from "react";
import { defaultSettings, type Product } from "@/lib/catalog";
import { useCatalog } from "@/lib/client";
import { brandPath as catalogBrandPath, categoryList, defaultTaxonomy } from "@/lib/taxonomy";
import { cleanText, cleanTitle } from "@/lib/display";

export const CatalogContext = createContext<ReturnType<typeof useCatalog> | null>(null);
export function usePublic() { return useContext(CatalogContext)!; }

export type PublicCategory = ReturnType<typeof categoryList>[number] & { label: string; shortLabel: string };

// Taxonomía real con los nombres ya normalizados para mostrar.
export function useOrganization() {
  const data = usePublic()?.data;
  const taxonomy = data?.taxonomy || defaultTaxonomy;
  return useMemo(() => {
    const categories: PublicCategory[] = categoryList(taxonomy).map(c => ({ ...c, label: cleanTitle(c.title), shortLabel: cleanTitle(c.short) || cleanTitle(c.title) }));
    return {
      taxonomy,
      categories,
      allBrands: taxonomy.brands.filter(b => b.active).map(b => b.name),
      brandPath: (type: string, brand: string) => catalogBrandPath(type, brand, taxonomy),
      subBrands: (name: string, type: string) => taxonomy.brands.find(b => b.name === name)?.subBrands.filter(s => s.active && s.categoryIds.includes(type)) || [],
    };
  }, [taxonomy]);
}

export function useSettings() {
  const settings = usePublic()?.data?.settings || defaultSettings;
  return useMemo(() => ({ ...settings, cleanTagline: cleanTitle(settings.tagline), cleanDescription: cleanText(settings.businessDescription) }), [settings]);
}

export const hasPhoto = (p: Product) => !!p.imageUrl && !p.imageUrl.includes("/placeholders/");

// Productos con foto real, en el orden del catálogo, para composiciones.
export function withPhotos(products: Product[]) {
  return products.filter(hasPhoto).sort((a, b) => a.order - b.order);
}
