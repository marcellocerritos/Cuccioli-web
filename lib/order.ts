// "Mi pedido": lógica solo de cliente. Se guarda en localStorage y, al enviar,
// se recalcula con el catálogo actual. No toca el modelo de datos ni la API.
import { money, variantPrice, whatsappUrl, type Product, type Variant } from "./catalog";
import { site } from "../content/site";

export const ORDER_KEY = "cuccioli_pedido_v1";
export const MAX_QTY = 99;

// name, size y price son una foto del momento en que se agregó: sirven para avisar
// si el producto desaparece o si el precio cambió. El precio que vale es el actual.
export type OrderLine = { productId: string; variantId: string; quantity: number; name: string; size: string; price: number };
export type ResolvedLine = { key: string; line: OrderLine; product: Product; variant: Variant; quantity: number; unitPrice: number; total: number; consult: boolean };
export type ResolvedOrder = { items: ResolvedLine[]; removed: OrderLine[]; subtotal: number; count: number; consultCount: number; priceChanged: boolean };

export const lineKey = (l: Pick<OrderLine, "productId" | "variantId">) => `${l.productId}::${l.variantId}`;
const clamp = (n: number) => Math.min(MAX_QTY, Math.max(0, Math.floor(Number.isFinite(n) ? n : 0)));
const round = (n: number) => Math.round(n * 100) / 100;

export function addLine(lines: OrderLine[], product: Product, variantId: string, quantity = 1): OrderLine[] {
  const variant = product.variants.find(v => v.id === variantId && v.active);
  const qty = clamp(quantity);
  if (!variant || qty < 1) return lines;
  const key = lineKey({ productId: product.id, variantId });
  const snapshot = { name: product.name, size: variant.size, price: variantPrice(product, variant) };
  if (lines.some(l => lineKey(l) === key)) return lines.map(l => lineKey(l) === key ? { ...l, ...snapshot, quantity: clamp(l.quantity + qty) || 1 } : l);
  return [...lines, { productId: product.id, variantId, quantity: qty, ...snapshot }];
}

export function setQuantity(lines: OrderLine[], key: string, quantity: number): OrderLine[] {
  const qty = clamp(quantity);
  return qty < 1 ? removeLine(lines, key) : lines.map(l => lineKey(l) === key ? { ...l, quantity: qty } : l);
}

export function removeLine(lines: OrderLine[], key: string): OrderLine[] {
  return lines.filter(l => lineKey(l) !== key);
}

export function parseOrder(raw: string | null | undefined): OrderLine[] {
  try {
    const data = JSON.parse(raw || "[]");
    if (!Array.isArray(data)) return [];
    const seen = new Set<string>();
    return data.flatMap((l): OrderLine[] => {
      if (!l || typeof l.productId !== "string" || typeof l.variantId !== "string") return [];
      const quantity = clamp(Number(l.quantity));
      const key = lineKey(l);
      if (quantity < 1 || seen.has(key)) return [];
      seen.add(key);
      return [{ productId: l.productId, variantId: l.variantId, quantity, name: String(l.name || ""), size: String(l.size || ""), price: Number(l.price) || 0 }];
    });
  } catch { return []; }
}

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;
const browserStorage = (): StorageLike | null => { try { return typeof localStorage === "undefined" ? null : localStorage; } catch { return null; } };

export function loadOrder(storage: StorageLike | null = browserStorage()): OrderLine[] {
  try { return parseOrder(storage?.getItem(ORDER_KEY)); } catch { return []; }
}

export function saveOrder(lines: OrderLine[], storage: StorageLike | null = browserStorage()) {
  try { if (lines.length) storage?.setItem(ORDER_KEY, JSON.stringify(lines)); else storage?.removeItem(ORDER_KEY); } catch { /* sin almacenamiento: el pedido vive solo en memoria */ }
}

// Cruza el pedido con el catálogo visible actual: precios vigentes (las promociones
// expiran) y descarte de productos o presentaciones que ya no están activos.
export function resolveOrder(lines: OrderLine[], products: Product[]): ResolvedOrder {
  const items: ResolvedLine[] = [];
  const removed: OrderLine[] = [];
  let priceChanged = false;
  for (const line of lines) {
    const product = products.find(p => p.id === line.productId && p.active);
    const variant = product?.variants.find(v => v.id === line.variantId && v.active);
    if (!product || !variant) { removed.push(line); continue; }
    const unitPrice = variantPrice(product, variant);
    if (round(unitPrice) !== round(line.price)) priceChanged = true;
    items.push({ key: lineKey(line), line, product, variant, quantity: line.quantity, unitPrice, total: round(unitPrice * line.quantity), consult: unitPrice <= 0 });
  }
  return {
    items,
    removed,
    subtotal: round(items.filter(i => !i.consult).reduce((sum, i) => sum + i.total, 0)),
    count: items.reduce((sum, i) => sum + i.quantity, 0),
    consultCount: items.filter(i => i.consult).length,
    priceChanged,
  };
}

// Actualiza la foto guardada con lo que se acaba de resolver (precios y nombres actuales).
export function refreshLines(order: ResolvedOrder): OrderLine[] {
  return order.items.map(i => ({ ...i.line, name: i.product.name, size: i.variant.size, price: i.unitPrice }));
}

type MessageText = typeof site.order.message;
const messageText: MessageText = site.order.message;

export function orderMessage(order: ResolvedOrder, text: MessageText = messageText) {
  const lines = order.items.map(i => `• ${i.quantity} × ${i.product.name} (${i.variant.size}) — ${i.consult ? text.consult : money(i.total)}`);
  const priced = order.items.some(i => !i.consult);
  const subtotal = priced ? `${text.subtotal}: ${money(order.subtotal)}${order.consultCount ? ` (${text.subtotalNote})` : ""}` : "";
  return [text.greeting, ...lines, subtotal, text.closing].filter(Boolean).join("\n");
}

// Mismo criterio de número que whatsappUrl: si el número no es válido, devuelve null.
export function orderWhatsAppUrl(number: string, order: ResolvedOrder, text: MessageText = messageText) {
  if (!whatsappUrl(number) || !order.items.length) return null;
  return `https://wa.me/${number}?text=${encodeURIComponent(orderMessage(order, text))}`;
}
