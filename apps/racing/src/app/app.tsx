import { defineProduct } from "@hartico/shared";
import { ProductShell, type ProductSection } from "@hartico/ui";

const product = defineProduct({
  id: "racing",
  name: "Hartico Racing",
  eyebrow: "Formula · Racing",
  description:
    "Temporadas, pilotos, escuderías y Grandes Premios con un modelo propio, trazable y preparado para crecer por vertical slices.",
  stage: "foundation",
  theme: {
    accent: "#ffcb45",
    accentStrong: "#ff5a36",
  },
});

const sections = [
  {
    title: "Calendario",
    description: "Circuitos, Grandes Premios y sesiones pertenecerán exclusivamente al dominio Racing.",
  },
  {
    title: "Competición",
    description: "Parrilla, resultados, penalizaciones y puntos se modelarán con reglas versionadas.",
  },
  {
    title: "Legado",
    description: "Campeonatos, récords, museo y awards llegarán después del primer flujo completo.",
  },
] satisfies readonly ProductSection[];

export function App() {
  return <ProductShell product={product} sections={sections} />;
}
