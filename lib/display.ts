// Normalización solo para mostrar: los datos guardados no se tocan.
// Convierte las "negritas Unicode" (𝗧𝗼𝗱𝗼) en texto normal, quita emojis y,
// en títulos, el punto final. Conserva ®, © y ™.
const keep = new Set(["®", "©", "™"]);
const pictographic = new RegExp("\\p{Extended_Pictographic}|[\\u{FE0F}\\u{200D}\\u{20E3}\\u{1F3FB}-\\u{1F3FF}]", "gu");

export function cleanText(value: string | null | undefined) {
  return (value || "")
    .normalize("NFKC")
    .replace(pictographic, ch => keep.has(ch) ? ch : "")
    .split("\n").map(line => line.replace(/[ \t]+/g, " ").trim()).join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function cleanTitle(value: string | null | undefined) {
  return cleanText(value).replace(/\s+/g, " ").replace(/\.+$/, "").trim();
}

// Divide un titular para poner la última palabra en serif itálica.
export function splitLastWord(text: string) {
  const match = text.match(/^([\s\S]*\s)?(\S+)$/);
  return match ? { lead: match[1] || "", last: match[2] } : { lead: text, last: "" };
}

// Agrupa variantes de una misma marca ("PURINA®" y "PURINA® Alimento Húmedo").
export function brandFamily(name: string) {
  const clean = cleanTitle(name);
  const base = clean.includes("®") ? clean.slice(0, clean.indexOf("®")) : clean;
  return base.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

export function formatWhatsAppNumber(number: string) {
  return `+${number.slice(0, 3)} ${number.slice(3, 7)} ${number.slice(7)}`;
}
