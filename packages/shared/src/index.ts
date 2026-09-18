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
