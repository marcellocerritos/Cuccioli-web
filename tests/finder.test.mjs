// Tests de lib/finder.ts (buscador guiado). Usan datos de prueba propios; si existe
// catalogo-publico.json (local, ignorado por git) también miden la cobertura real.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = fileURLToPath(new URL("..", import.meta.url));
const bundle = await build({ stdin: { contents: 'export * from "./lib/finder.ts"; export { site } from "./content/site.ts";', resolveDir: root }, bundle: true, write: false, format: "esm", platform: "node", alias: { "@": root } });
const { classify, matchesStage, parseAnswers, finderSteps, currentStep, rankProducts, helpMessage, site } = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`);

let order = 0;
const p = (petType, brandId, subBrand, name, description = "") => ({ id: `t${order}`, brand: brandId.toUpperCase(), brandId, subBrand, petType, name, description, specifications: "", imageUrl: "", variants: [{ id: "v", size: "3 kg", price: 10, promoPrice: 0, active: true }], isOnPromotion: false, promotionEndDate: null, active: true, order: order++, createdAt: "2026-01-01T00:00:00.000Z" });
const products = [
  p("dog", "purina", "Pro Plan", "Pro Plan Cachorro Raza Mediana Optistart", "Alimento seco para cachorros de razas medianas."),
  p("dog", "purina", "Pro Plan", "Pro Plan Cachorro Raza Pequeña Optistart"),
  p("dog", "purina", "Pro Plan", "Pro Plan Adulto Raza Mediana Optihealth"),
  p("dog", "purina", "Pro Plan", "Pro Plan Senior Active Mind Razas Pequeñas Optiage"),
  p("dog", "purina", "DOG CHOW® Adulto.", "DOG CHOW® Comida para Perros Adultos Medianos & Grandes."),
  p("dog", "purina", "DOG CHOW® Cachorro.", "DOG CHOW® Comida para Perros Cachorros Medianos & Grandes."),
  p("dog", "purina", "ALPO® Adulto & Cachorro.", "ALPO® Perro Adulto & Cachorro Todos los Tamaños"),
  p("dog", "purina-humedo", "Dog Chow® Adulto & Cachorro", "Dog Chow® Alimento Húmedo Perro Adultos & Cachorros"),
  p("dog", "evangers", "Super Premium", "Duck & Sweet Potato", "Alta digestibilidad - Para todas las etapas de vida"),
  p("dog", "evangers", "Complete Classic Dinners", "Lamb & Rice Dinner", "Dieta completa y balanceada - para todas las etapas de vida"),
  p("dog", "evangers", "Grain-Free Game Meats", "Rabbit", "Alimento húmedo complementario de conejo."),
  p("cat", "purina", "Pro Plan", "Pro Plan Adult Gato Senior 7 + 3kg"),
  p("cat", "purina", "Pro Plan", "Pro Plan Gatito Pollo y Arroz"),
  p("cat", "purina", "CAT CHOW® Adulto.", "CAT CHOW® Adulto Pescado con DEFENSE PLUS®"),
  p("medicine", "ferox", "", "Ferox perros gigantes"),
  p("medicine", "interfarma", "Kitty Aid", "KITTY AID Stress Cat"),
];
const byName = name => { const x = products.find(x => x.name === name); assert.ok(x, name); return x; };

// Clasificación por palabras clave
const c1 = classify(byName("Pro Plan Cachorro Raza Mediana Optistart"));
assert.deepEqual([c1.pet, c1.stages, c1.sizes], ["perro", ["cachorro"], ["mediano"]]);
const c2 = classify(byName("Pro Plan Adult Gato Senior 7 + 3kg"));
assert.deepEqual([c2.pet, c2.stages], ["gato", ["senior"]], "senior gana a adult");
assert.deepEqual(classify(byName("DOG CHOW® Comida para Perros Adultos Medianos & Grandes.")).sizes, ["mediano", "grande"]);
assert.ok(classify(byName("ALPO® Perro Adulto & Cachorro Todos los Tamaños")).allSizes);
assert.ok(classify(byName("Duck & Sweet Potato")).allStages, "todas las etapas de vida");
assert.ok(matchesStage(classify(byName("Duck & Sweet Potato")), "senior"));
assert.deepEqual(classify(byName("Pro Plan Gatito Pollo y Arroz")).stages, ["cachorro"]);
assert.deepEqual(classify(byName("Pro Plan Senior Active Mind Razas Pequeñas Optiage")).sizes, ["pequeno"]);
assert.deepEqual(classify(byName("Ferox perros gigantes")).sizes, ["grande"]);
assert.equal(classify(byName("KITTY AID Stress Cat")).pet, "gato");
assert.deepEqual(classify(byName("Rabbit")).stages, [], "sin etapa si no la menciona");
console.log("PASS · clasificación: etapa, tamaño, todas las etapas/tamaños y mascota");

// Respuestas en query params y pasos
assert.deepEqual(parseAnswers(new URLSearchParams("para=perro&etapa=cachorro&tamano=mediano&marca=purina")), { para: "perro", etapa: "cachorro", tamano: "mediano", marca: "purina" });
assert.deepEqual(parseAnswers(new URLSearchParams("para=loro&etapa=cachorro")), {}, "valores inválidos se ignoran");
assert.deepEqual(parseAnswers(new URLSearchParams("para=gato&tamano=grande&etapa=adulto")), { para: "gato", etapa: "adulto" }, "los gatos no tienen tamaño");
assert.deepEqual(parseAnswers(new URLSearchParams("para=perro&marca=purina")), { para: "perro" }, "no se salta pasos");
assert.deepEqual(finderSteps({ para: "gato" }), ["para", "etapa", "marca"]);
assert.equal(currentStep({}), "para");
assert.equal(currentStep({ para: "perro", etapa: "adulto" }), "tamano");
assert.equal(currentStep({ para: "gato", etapa: "adulto" }), "marca");
assert.equal(currentStep({ para: "gato", etapa: "adulto", marca: "sin" }), "resultados");
console.log("PASS · buscador: respuestas compartibles, validación y pasos (tamaño solo perros)");

// Ranking
let r = rankProducts(products, { para: "perro", etapa: "cachorro", tamano: "mediano", marca: "sin" });
assert.equal(r.fallback, false);
assert.ok(/Cachorro/.test(r.matches[0].product.name) && /Median/.test(r.matches[0].product.name), r.matches[0].product.name);
assert.deepEqual(r.matches[0].reasons.map(x => x.kind), ["stage", "size"]);
assert.ok(r.matches.every(m => m.product.petType === "dog"));
assert.ok(!r.matches.some(m => m.product.name === "Pro Plan Adulto Raza Mediana Optihealth"), "excluye lo que es solo para adultos");
assert.ok(!r.matches.some(m => m.product.name === "Pro Plan Cachorro Raza Pequeña Optistart"), "excluye otro tamaño");
assert.ok(r.matches.some(m => m.reasons.some(x => x.kind === "allStages")), "incluye 'todas las etapas'");
assert.ok(r.matches.findIndex(m => m.reasons.some(x => x.kind === "anySize")) > r.matches.findIndex(m => m.reasons.some(x => x.kind === "size")), "sin tamaño específico va después");
r = rankProducts(products, { para: "gato", etapa: "senior", marca: "sin" });
assert.equal(r.matches[0].product.name, "Pro Plan Adult Gato Senior 7 + 3kg");
assert.ok(r.matches.every(m => m.product.petType === "cat"));
r = rankProducts(products, { para: "perro", etapa: "adulto", tamano: "nose", marca: "evangers" });
assert.ok(r.matches.length > 0 && r.matches.every(m => m.product.brandId === "evangers"));
r = rankProducts(products, { para: "gato", etapa: "adulto", marca: "evangers" });
assert.equal(r.fallback, true, "marca sin opciones para gatos: respaldo honesto");
assert.ok(r.matches.length > 0);
console.log("PASS · ranking: orden por coincidencia, exclusión de contradicciones y respaldo");

// Mensaje de "Ayudame a elegir"
const t = site.finder.helpText;
assert.equal(helpMessage({ para: "perro", etapa: "cachorro", tamano: "mediano", marca: "purina" }, t, "mediano", "PURINA®"), "¡Hola, Cuccioli! ¿Me ayudan a elegir? Busco comida para mi perro cachorro, de tamaño mediano. Marca preferida: PURINA®.");
assert.equal(helpMessage({ para: "gato", etapa: "cachorro", marca: "sin" }, t), "¡Hola, Cuccioli! ¿Me ayudan a elegir? Busco comida para mi gatito.");
assert.equal(helpMessage({ para: "perro", etapa: "senior", tamano: "nose" }, t, "No sé"), "¡Hola, Cuccioli! ¿Me ayudan a elegir? Busco comida para mi perro senior.");
console.log("PASS · buscador: mensaje de WhatsApp que resume las respuestas");

// Cobertura sobre el catálogo real, solo si está el archivo local (no se versiona).
const real = await readFile(new URL("../catalogo-publico.json", import.meta.url), "utf8").then(JSON.parse).catch(() => null);
if (real) {
  const food = real.products.filter(x => x.active && (x.petType === "dog" || x.petType === "cat"));
  const dogFood = food.filter(x => x.petType === "dog");
  const withStage = food.filter(x => { const c = classify(x); return c.stages.length || c.allStages; });
  const withSize = dogFood.filter(x => { const c = classify(x); return c.sizes.length || c.allSizes; });
  assert.ok(withStage.length / food.length >= 0.85, `etapa: ${withStage.length}/${food.length}`);
  console.log(`PASS · cobertura real: etapa ${withStage.length}/${food.length} (${Math.round(withStage.length / food.length * 100)} %), tamaño ${withSize.length}/${dogFood.length} (${Math.round(withSize.length / dogFood.length * 100)} %)`);
} else {
  console.log("SKIP · cobertura real: no está catalogo-publico.json (archivo local)");
}
