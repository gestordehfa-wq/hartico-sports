export type SportId = "racing" | "football" | "tennis";
export type SportSite = Readonly<{ id: SportId; label: string; href: string }>;

/** Directorio de sitios para la navegación compartida; no contiene reglas deportivas. */
export const sportSites: readonly SportSite[] = [
  { id: "racing", label: "Racing", href: "https://racing.hfa.bar" },
  { id: "football", label: "Football", href: "https://football.hfa.bar" },
  { id: "tennis", label: "Tennis", href: "https://tennis.hfa.bar" },
];

export type ProductStage = "foundation" | "development" | "production";

export type ProductTheme = Readonly<{
  accent: string;
  accentStrong: string;
}>;

export type ProductConfig = Readonly<{
  id: string;
  name: string;
  eyebrow: string;
  description: string;
  stage: ProductStage;
  theme: ProductTheme;
}>;

export function defineProduct(config: ProductConfig): ProductConfig {
  if (!config.id.trim() || !config.name.trim()) {
    throw new Error("Product id and name are required.");
  }

  return Object.freeze(config);
}
