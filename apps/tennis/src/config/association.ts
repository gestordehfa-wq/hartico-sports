import type { CSSProperties } from "react";

export type AssociationConfig = Readonly<{
  name: string;
  acronym: string;
  holoName: string;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  seasonLabel: string;
}>;
const text = (value: string | undefined, fallback: string) => value?.trim() || fallback;
function color(value: string | undefined, fallback: string): string {
  const candidate = value?.trim();
  return candidate && /^#[0-9a-f]{6}$/i.test(candidate) ? candidate : fallback;
}
export const association: AssociationConfig = Object.freeze({
  name: text(import.meta.env.VITE_ASSOCIATION_NAME, "Hartico Tennis Association"),
  acronym: text(import.meta.env.VITE_ASSOCIATION_ACRONYM, "HTA"),
  holoName: text(import.meta.env.VITE_HOLO_NAME, "Hartico Tennis"),
  logoUrl: import.meta.env.VITE_ASSOCIATION_LOGO_URL?.trim() || null,
  primaryColor: color(import.meta.env.VITE_PRIMARY_COLOR, "#355f3b"),
  secondaryColor: color(import.meta.env.VITE_SECONDARY_COLOR, "#e1ebd8"),
  seasonLabel: text(import.meta.env.VITE_SEASON_LABEL, "Temporada 1"),
});
export type AssociationTheme = CSSProperties & {
  "--association-primary": string;
  "--association-secondary": string;
};
export const associationTheme: AssociationTheme = {
  "--association-primary": association.primaryColor,
  "--association-secondary": association.secondaryColor,
};
