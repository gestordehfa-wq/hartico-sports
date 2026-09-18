import { defineProduct } from "@hartico/shared";
import { ProductShell, type ProductSection } from "@hartico/ui";

const product = defineProduct({
  id: "football-lite",
  name: "Football Lite",
  eyebrow: "Simple · White-label",
  description:
    "Una base de fútbol clara para asociaciones independientes, sin trasladar la complejidad ni los módulos editoriales de HFA.",
  stage: "foundation",
  theme: {
    accent: "#67e89d",
    accentStrong: "#1dbd75",
  },
});

const sections = [
  {
    title: "Asociaciones",
    description: "Identidad visual configurable y aislamiento de datos diseñado desde la primera migración.",
  },
  {
    title: "Competición esencial",
    description: "Temporadas, equipos, plantillas, partidos, resultados y clasificación sin extras HFA.",
  },
  {
    title: "Historia",
    description: "Estadísticas, awards e historial llegarán sobre datos deportivos simples y reproducibles.",
  },
] satisfies readonly ProductSection[];

export function App() {
  return <ProductShell product={product} sections={sections} />;
}
