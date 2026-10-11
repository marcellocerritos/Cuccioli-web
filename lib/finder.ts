// Clasificación derivada solo en el cliente, por palabras clave sobre name,
// subBrand, description y specifications. No agrega campos al modelo de datos.
// Calibrada con catalogo-publico.json (oct. 2026): etapa en 41/45 alimentos de
// perro y gato (91 %); tamaño explícito en 17/33 alimentos de perro (52 %).
import type { Product } from "./catalog";

export type Stage = "cachorro" | "adulto" | "senior";
export type Size = "pequeno" | "mediano" | "grande";
export type Pet = "perro" | "gato";
export type Classification = { pet: Pet | null; stages: Stage[]; allStages: boolean; sizes: Size[]; allSizes: boolean };

export const normalize = (value: string) => value.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLocaleLowerCase("es");

const stageWords: Record<Stage, RegExp> = {
  cachorro: /\b(cachorr[oa]s?|puppy|junior|kitten|gatit[oa]s?|optistart|optigrowth)\b/,
  senior: /\b(senior|mayor(es)?|7 ?\+|optiage)\b/,
  adulto: /\b(adult[oa]?s?)\b/,
};
const allStagesWords = /\btodas las etapas\b/;
const sizeWords: Record<Size, RegExp> = {
  pequeno: /\b(minis?|pequen[oa]s?|small|toy|miniaturas?)\b/,
  mediano: /\b(median[oa]s?|medium|med)\b/,
  grande: /\b(grandes?|large|larg|giant|gigantes?|maxi|gr)\b/,
};
const allSizesWords = /\btodos los taman[oa]s\b/;
const dogWords = /\b(perr[oa]s?|canin[oa]s?|dog|puppy|cachorr[oa]s?)\b/;
const catWords = /\b(gat[oa]s?|gatit[oa]s?|felin[oa]s?|cat|kitty|kitten)\b/;

function match<T extends string>(text: string, words: Record<T, RegExp>) {
  return (Object.keys(words) as T[]).filter(k => words[k].test(text));
}

export function classify(p: Product): Classification {
  const primary = normalize(`${p.name} ${p.subBrand}`);
  const full = normalize(`${p.name} ${p.subBrand} ${p.description} ${p.specifications}`);
  // La etapa se busca primero en nombre y línea; la descripción solo de respaldo.
  let stages = match(primary, stageWords);
  if (!stages.length) stages = match(full, stageWords);
  if (stages.includes("senior")) stages = stages.filter(s => s !== "adulto"); // "Adult Gato Senior 7+"
  const allStages = allStagesWords.test(full);
  // El tamaño solo cuenta si está en el nombre o la línea (las descripciones hablan de "razas grandes" en general).
  const sizes = match(primary, sizeWords);
  const allSizes = allSizesWords.test(primary);
  const pet: Pet | null = p.petType === "dog" ? "perro" : p.petType === "cat" ? "gato" : dogWords.test(full) && !catWords.test(primary) ? "perro" : catWords.test(full) ? "gato" : null;
  return { pet, stages, allStages, sizes, allSizes };
}

export function matchesStage(c: Classification, stage: Stage) {
  return c.allStages || c.stages.includes(stage);
}

export const stageValues: Stage[] = ["cachorro", "adulto", "senior"];
export const isStage = (value: string | null): value is Stage => !!value && (stageValues as string[]).includes(value);

// ---------------------------------------------------------------------------
// Buscador guiado (/encontra-su-comida): respuestas en query params, pasos y ranking.
export type SizeAnswer = Size | "nose";
export type FinderAnswers = { para?: Pet; etapa?: Stage; tamano?: SizeAnswer; marca?: string };
export type FinderStep = "para" | "etapa" | "tamano" | "marca";
export type Reason = { kind: "stage" | "allStages" | "size" | "allSizes" | "anySize" | "brand"; value?: string };
export type FinderMatch = { product: Product; score: number; exact: boolean; reasons: Reason[] };
export type FinderResult = { matches: FinderMatch[]; exactCount: number; fallback: boolean };

const sizeValues: Size[] = ["pequeno", "mediano", "grande"];
const petCategory: Record<Pet, string> = { perro: "dog", gato: "cat" };

export function parseAnswers(params: URLSearchParams): FinderAnswers {
  const para = params.get("para");
  const etapa = params.get("etapa");
  const tamano = params.get("tamano");
  const marca = params.get("marca");
  const answers: FinderAnswers = {};
  if (para === "perro" || para === "gato") answers.para = para;
  if (answers.para && isStage(etapa)) answers.etapa = etapa;
  if (answers.para === "perro" && answers.etapa && (tamano === "nose" || (sizeValues as string[]).includes(tamano || ""))) answers.tamano = tamano as SizeAnswer;
  if (answers.para && answers.etapa && (answers.para === "gato" || answers.tamano) && marca && /^[\w-]{1,80}$/.test(marca)) answers.marca = marca;
  return answers;
}

export function finderSteps(answers: FinderAnswers): FinderStep[] {
  return answers.para === "gato" ? ["para", "etapa", "marca"] : ["para", "etapa", "tamano", "marca"];
}

export function currentStep(answers: FinderAnswers): FinderStep | "resultados" {
  return finderSteps(answers).find(step => !answers[step]) || "resultados";
}

export const categoryForPet = (pet: Pet) => petCategory[pet];

// Ordena los alimentos de la mascota elegida por coincidencia, con el porqué.
// Excluye lo que contradice la respuesta (otra etapa u otro tamaño). Si no hay
// coincidencias exactas o la marca elegida no tiene opciones, avisa con fallback.
export function rankProducts(products: Product[], answers: FinderAnswers, brandIdOf: (p: Product) => string | undefined = p => p.brandId): FinderResult {
  if (!answers.para) return { matches: [], exactCount: 0, fallback: false };
  const pool = products.filter(p => p.petType === petCategory[answers.para!] && p.variants.some(v => v.active));
  const size = answers.tamano && answers.tamano !== "nose" ? answers.tamano : undefined;
  const scored = pool.map((product): FinderMatch & { conflict: boolean; brandOk: boolean } => {
    const c = classify(product);
    const reasons: Reason[] = [];
    let score = 0, conflict = false, stageOk = !answers.etapa, sizeOk = !size;
    if (answers.etapa) {
      if (c.stages.includes(answers.etapa)) { score += 4; stageOk = true; reasons.push({ kind: "stage", value: answers.etapa }); }
      else if (c.allStages) { score += 3; stageOk = true; reasons.push({ kind: "allStages" }); }
      else if (c.stages.length) conflict = true;
    }
    if (size) {
      if (c.sizes.includes(size)) { score += 3; sizeOk = true; reasons.push({ kind: "size", value: size }); }
      else if (c.allSizes) { score += 2; sizeOk = true; reasons.push({ kind: "allSizes" }); }
      else if (c.sizes.length) conflict = true;
      else { score += 1; reasons.push({ kind: "anySize" }); }
    }
    const brandOk = !answers.marca || answers.marca === "sin" || brandIdOf(product) === answers.marca;
    if (answers.marca && answers.marca !== "sin" && brandOk) { score += 2; reasons.push({ kind: "brand", value: product.brand }); }
    return { product, score, exact: stageOk && sizeOk && brandOk, reasons, conflict, brandOk };
  });
  const byScore = (a: FinderMatch, b: FinderMatch) => b.score - a.score || a.product.order - b.product.order;
  const clean = ({ product, score, exact, reasons }: FinderMatch) => ({ product, score, exact, reasons });
  let candidates = scored.filter(m => !m.conflict);
  let fallback = false;
  if (answers.marca && answers.marca !== "sin") {
    const ofBrand = candidates.filter(m => m.brandOk);
    if (ofBrand.length) candidates = ofBrand; else fallback = true;
  }
  if (!candidates.length) { candidates = scored; fallback = true; }
  const matches = candidates.sort(byScore).map(clean);
  const exactCount = matches.filter(m => m.exact).length;
  return { matches, exactCount, fallback: fallback || exactCount === 0 };
}

export type HelpText = { greeting: string; pet: Record<Pet, string>; kitten: string; stage: Record<Stage, string>; size: (size: string) => string; brand: (brand: string) => string };

// Mensaje de "Ayudame a elegir" que resume las respuestas.
export function helpMessage(answers: FinderAnswers, text: HelpText, sizeLabel?: string, brandName?: string) {
  let who = answers.para ? text.pet[answers.para] : "";
  if (answers.para === "gato" && answers.etapa === "cachorro") who = text.kitten;
  else if (answers.para && answers.etapa) who = `${who} ${text.stage[answers.etapa]}`;
  const parts = [`${text.greeting}${who ? ` ${who}` : ""}`];
  if (answers.para === "perro" && answers.tamano && answers.tamano !== "nose" && sizeLabel) parts[0] += `, ${text.size(sizeLabel)}`;
  let message = `${parts[0]}.`;
  if (brandName) message += ` ${text.brand(brandName)}.`;
  return message;
}
