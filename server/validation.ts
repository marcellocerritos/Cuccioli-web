import { z } from "zod";
const safeImage = z.string().max(2048).refine(v=>v==="" || /^\/(placeholders\/[-a-z0-9]+\.svg|api\/images\/[a-f0-9-]+\.(png|jpg|webp)|catalog-images\/[-a-z0-9]+\.(png|jpg|webp))$/.test(v) || /^https:\/\/firebasestorage\.googleapis\.com\//.test(v), "Subí una imagen desde el formulario.");
export const productSchema = z.object({
  brand: z.string().min(1).max(100), brandId: z.string().max(80).optional(), subBrand: z.string().trim().max(100), subBrandId: z.string().max(80).optional(), petType: z.string().regex(/^[a-z0-9-]{1,80}$/),
  name: z.string().trim().min(2,"Ingresá un nombre de al menos 2 caracteres.").max(160), description: z.string().trim().max(2000), specifications: z.string().trim().max(5000), imageUrl: safeImage,
  variants: z.array(z.object({ id: z.string().min(1).max(80), size: z.string().trim().min(1,"Completá el tamaño de cada variante.").max(80), price: z.number().finite().min(0).max(100000), promoPrice: z.number().finite().min(0).max(100000), active: z.boolean() })).min(1,"Agregá al menos una variante.").max(30),
  isOnPromotion: z.boolean(), promotionEndDate: z.string().datetime().nullable(), active: z.boolean(), order: z.number().int().min(0).max(1000000),
}).superRefine((p,ctx)=>{
  if (new Set(p.variants.map(v=>v.id)).size !== p.variants.length) ctx.addIssue({code:"custom",message:"Las variantes deben ser distintas.",path:["variants"]});
  if (p.active && !p.variants.some(v=>v.active)) ctx.addIssue({code:"custom",message:"Activá al menos una variante o desactivá el producto.",path:["variants"]});
  for (const v of p.variants) if (p.isOnPromotion && v.price>0 && v.promoPrice>=v.price) ctx.addIssue({code:"custom",message:"El precio en promoción debe ser menor al normal.",path:["variants"]});
});
export const settingsSchema = z.object({ businessName: z.string().trim().min(2).max(100), tagline: z.string().trim().min(3).max(140), businessDescription: z.string().trim().max(1000), whatsappNumber: z.string().regex(/^[1-9]\d{7,14}$/, "Ingresá el número con código de país, sin espacios ni signos.") });
