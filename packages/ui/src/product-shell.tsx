import type { CSSProperties, ReactNode } from "react";
import type { ProductConfig } from "@hartico/shared";

export type ProductSection = Readonly<{
  title: string;
  description: string;
}>;

type ProductShellProps = Readonly<{
  product: ProductConfig;
  sections: readonly ProductSection[];
  children?: ReactNode;
}>;

type ThemeProperties = CSSProperties & {
  "--product-accent": string;
  "--product-accent-strong": string;
};

export function ProductShell({ product, sections, children }: ProductShellProps) {
  const theme: ThemeProperties = {
    "--product-accent": product.theme.accent,
    "--product-accent-strong": product.theme.accentStrong,
  };

  return (
    <div className="product-shell" style={theme}>
      <header className="product-header">
        <a className="product-brand" href="/" aria-label={`${product.name}, inicio`}>
          <span className="product-mark" aria-hidden="true">HS</span>
          <span>{product.name}</span>
        </a>
        <span className="stage-badge">{product.stage}</span>
      </header>

      <main>
        <section className="hero" aria-labelledby="product-title">
          <p className="eyebrow">{product.eyebrow}</p>
          <h1 id="product-title">{product.name}</h1>
          <p className="hero-copy">{product.description}</p>
          <p className="foundation-note">
            Arquitectura preparada. El dominio y Supabase se implementarán por
            incrementos aprobados.
          </p>
        </section>

        <section className="section-grid" aria-label="Capacidades previstas">
          {sections.map((section) => (
            <article className="section-card" key={section.title}>
              <h2>{section.title}</h2>
              <p>{section.description}</p>
            </article>
          ))}
        </section>

        {children}
      </main>

      <footer>
        <span>Hartico Sports</span>
        <span>Productos independientes · infraestructura común</span>
      </footer>
    </div>
  );
}
