// Rutas públicas fijas de la tienda. Una categoría con uno de estos paths
// quedaría tapada por la ruta fija, así que el admin no permite crearla.
export const finderPath = "/encontra-su-comida";
export const productPath = (id: string) => `/producto/${encodeURIComponent(id)}`;
export const reservedCategoryPaths = ["admin", "api", "catalogo", "promociones", "producto", "encontra-su-comida"];

export type FinderParams = { para?: "perro" | "gato"; etapa?: "cachorro" | "adulto" | "senior"; tamano?: string; marca?: string };
export const finderUrl = (params: FinderParams = {}) => {
  const query = new URLSearchParams(Object.entries(params).filter((e): e is [string, string] => !!e[1]));
  return query.size ? `${finderPath}?${query}` : finderPath;
};
