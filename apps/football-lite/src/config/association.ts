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

function text(value: string | undefined, fallback: string): string {
  return value?.trim() || fallback;
}

function color(value: string | undefined, fallback: string): string {
  const candidate = value?.trim();
  return candidate && /^#[0-9a-f]{6}$/i.test(candidate) ? candidate : fallback;
}

export const association: AssociationConfig = Object.freeze({
  name: text(import.meta.env.VITE_ASSOCIATION_NAME, "Football Association"),
  acronym: text(import.meta.env.VITE_ASSOCIATION_ACRONYM, "FA"),
  holoName: text(import.meta.env.VITE_HOLO_NAME, "Football Lite"),
  logoUrl: import.meta.env.VITE_ASSOCIATION_LOGO_URL?.trim() || null,
  primaryColor: color(import.meta.env.VITE_PRIMARY_COLOR, "#174f37"),
  secondaryColor: color(import.meta.env.VITE_SECONDARY_COLOR, "#dce9e1"),
  seasonLabel: text(import.meta.env.VITE_SEASON_LABEL, "Temporada"),
});

export type AssociationTheme = CSSProperties & {
  "--association-primary": string;
  "--association-secondary": string;
};

export const associationTheme: AssociationTheme = {
  "--association-primary": association.primaryColor,
  "--association-secondary": association.secondaryColor,
};
