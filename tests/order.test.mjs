// Tests de lib/order.ts ("Mi pedido"): lógica solo de cliente.
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = fileURLToPath(new URL("..", import.meta.url));
const bundle = await build({ stdin: { contents: 'export * from "./lib/order.ts"; export { money } from "./lib/catalog.ts";', resolveDir: root }, bundle: true, write: false, format: "esm", platform: "node", alias: { "@": root } });
const order = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`);
const { addLine, setQuantity, removeLine, parseOrder, loadOrder, saveOrder, resolveOrder, refreshLines, orderMessage, orderWhatsAppUrl, lineKey, MAX_QTY, ORDER_KEY } = order;

const base = { brand: "PURINA®", subBrand: "Pro Plan", petType: "dog", description: "", specifications: "", imageUrl: "", isOnPromotion: false, promotionEndDate: null, active: true, order: 0, createdAt: "2026-01-01T00:00:00.000Z" };
const proPlan = { ...base, id: "p1", name: "Pro Plan Adulto Raza Mediana", variants: [{ id: "a", size: "3kg", price: 29.06, promoPrice: 0, active: true }, { id: "b", size: "13kg", price: 112.03, promoPrice: 0, active: true }, { id: "off", size: "20kg", price: 150, promoPrice: 0, active: false }] };
const test = { ...base, id: "p2", brand: "DFV", subBrand: "", petType: "medicine", name: "DFV TEST FELV/FIV", variants: [{ id: "c", size: "Consultar presentación", price: 0, promoPrice: 0, active: true }] };
const promo = { ...base, id: "p3", name: "Tidy Cats®", isOnPromotion: true, promotionEndDate: "2099-01-01T00:00:00.000Z", variants: [{ id: "d", size: "4,54 kg", price: 7.75, promoPrice: 6.5, active: true }] };
const catalog = [proPlan, test, promo];

// Agregar, sumar, límites
let lines = addLine([], proPlan, "a");
lines = addLine(lines, proPlan, "a", 2);
assert.equal(lines.length, 1);
assert.equal(lines[0].quantity, 3);
assert.deepEqual([lines[0].name, lines[0].size, lines[0].price], ["Pro Plan Adulto Raza Mediana", "3kg", 29.06]);
assert.equal(addLine(lines, proPlan, "off").length, 1, "no agrega presentaciones inactivas");
assert.equal(addLine(lines, proPlan, "nope").length, 1, "no agrega presentaciones inexistentes");
assert.equal(addLine([], proPlan, "a", 500)[0].quantity, MAX_QTY, "tope de cantidad");
lines = addLine(lines, test, "c");
lines = addLine(lines, promo, "d", 2);
assert.equal(lines.length, 3);
assert.equal(setQuantity(lines, lineKey(lines[0]), 5)[0].quantity, 5);
assert.equal(setQuantity(lines, lineKey(lines[0]), 0).length, 2, "cantidad 0 quita el ítem");
assert.equal(removeLine(lines, lineKey(lines[1])).length, 2);
console.log("PASS · pedido: agregar, sumar, cambiar cantidad, quitar y límites");

// Persistencia tolerante a fallos
const mem = new Map(); const storage = { getItem: k => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v), removeItem: k => mem.delete(k) };
saveOrder(lines, storage);
assert.deepEqual(loadOrder(storage), lines);
saveOrder([], storage);
assert.equal(mem.has(ORDER_KEY), false, "un pedido vacío no deja basura");
assert.deepEqual(parseOrder("{roto"), []);
assert.deepEqual(parseOrder('{"a":1}'), []);
assert.deepEqual(parseOrder('[{"productId":"p1","variantId":"a","quantity":-2},{"productId":"p1","variantId":"a","quantity":2},{"productId":"p1","variantId":"a","quantity":4},{"x":1}]').map(l => l.quantity), [2], "descarta inválidos y duplicados");
const broken = { getItem() { throw new Error("bloqueado"); }, setItem() { throw new Error("lleno"); }, removeItem() { throw new Error("x"); } };
assert.deepEqual(loadOrder(broken), []);
assert.doesNotThrow(() => saveOrder(lines, broken));
assert.deepEqual(loadOrder(null), []);
console.log("PASS · pedido: localStorage con try/catch, datos corruptos y almacenamiento bloqueado");

// Recalcular con el catálogo actual
let resolved = resolveOrder(lines, catalog);
assert.equal(resolved.items.length, 3);
assert.equal(resolved.removed.length, 0);
assert.equal(resolved.subtotal, 100.18, "3 × 29.06 + 2 × 6.50; sin los de consultar");
assert.equal(resolved.consultCount, 1);
assert.equal(resolved.count, 6);
assert.equal(resolved.priceChanged, false);
// La promoción expira y el producto de prueba se desactiva
const later = [{ ...proPlan, variants: proPlan.variants.map(v => v.id === "a" ? { ...v, price: 30 } : v) }, { ...test, active: false }, { ...promo, promotionEndDate: "2000-01-01T00:00:00.000Z" }];
resolved = resolveOrder(lines, later);
assert.equal(resolved.removed.length, 1);
assert.equal(resolved.removed[0].name, "DFV TEST FELV/FIV");
assert.equal(resolved.priceChanged, true);
assert.equal(resolved.subtotal, 105.5, "3 × 30 + 2 × 7.75 (promo vencida)");
assert.equal(resolved.consultCount, 0);
assert.deepEqual(refreshLines(resolved).map(l => l.price), [30, 7.75]);
assert.equal(resolveOrder(refreshLines(resolved), later).priceChanged, false);
// Producto que ya no existe en el catálogo visible
assert.equal(resolveOrder(lines, [proPlan]).removed.length, 2);
console.log("PASS · pedido: recalcula precios, promociones vencidas y descarta ítems inactivos");

// Mensaje único de WhatsApp
resolved = resolveOrder(lines, catalog);
const message = orderMessage(resolved);
assert.equal(message, [
  "¡Hola, Cuccioli! Quiero hacer este pedido:",
  "• 3 × Pro Plan Adulto Raza Mediana (3kg) — $87.18",
  "• 1 × DFV TEST FELV/FIV (Consultar presentación) — precio por consultar",
  "• 2 × Tidy Cats® (4,54 kg) — $13.00",
  "Subtotal: $100.18 (sin los productos por consultar)",
  "¿Me confirman disponibilidad y entrega?",
].join("\n"));
const onlyConsult = orderMessage(resolveOrder(addLine([], test, "c"), catalog));
assert.doesNotMatch(onlyConsult, /Subtotal/, "sin subtotal si todo es por consultar");
assert.doesNotMatch(onlyConsult, /\$0/);
assert.match(orderMessage(resolveOrder(addLine([], proPlan, "b"), catalog)), /Subtotal: \$112\.03\n/, "sin nota si no hay productos por consultar");
const url = orderWhatsAppUrl("50373787442", resolved);
assert.ok(url.startsWith("https://wa.me/50373787442?text="));
assert.equal(new URL(url).searchParams.get("text"), message);
assert.equal(orderWhatsAppUrl("50300000000", resolved), null, "mismo criterio que whatsappUrl");
assert.equal(orderWhatsAppUrl("123", resolved), null);
assert.equal(orderWhatsAppUrl("50373787442", resolveOrder([], catalog)), null, "pedido vacío");
console.log("PASS · pedido: un solo mensaje de WhatsApp con la lista, subtotal y número validado");
