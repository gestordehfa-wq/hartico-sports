import { defineProduct } from "@hartico/shared";
import { ProductShell, type ProductSection } from "@hartico/ui";

const product = defineProduct({
  id: "tennis",
  name: "Hartico Tennis",
  eyebrow: "Tour · Draws · Legacy",
  description:
    "Torneos, cuadros, partidos y rankings con reglas propias, sin forzar el modelo de fútbol o automovilismo.",
  stage: "foundation",
  theme: {
    accent: "#d8f75b",
    accentStrong: "#8acb32",
  },
});

const sections = [
  {
    title: "Tour",
    description: "Temporadas, torneos, categorías y superficies con identidad histórica explícita.",
  },
  {
    title: "Cuadros",
    description: "Seeds, rondas, slots, partidos y sets se diseñarán como lenguaje propio del tenis.",
  },
  {
    title: "Ranking",
    description: "Puntos, head-to-head, palmarés y récords usarán reglas versionadas y auditables.",
  },
] satisfies readonly ProductSection[];

export function App() {
  return <ProductShell product={product} sections={sections} />;
}
