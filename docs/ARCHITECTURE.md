# Arquitectura de Hartico Sports

Estado: decisión inicial, revisable mediante ADR cuando exista evidencia nueva.

## Decisión

Hartico Sports será un monorepo de código y documentación, no un monolito de
runtime. Cada aplicación es una unidad desplegable y una frontera de dominio:

```text
                         packages/ui
                              ↑
apps/racing ───────┬── packages/auth
apps/football-lite ├── packages/database
apps/tennis ───────┴── packages/shared

racing domain       football domain       tennis domain
      ↓                    ↓                    ↓
Supabase Racing      Supabase Football      Supabase Tennis
```

No existe dependencia directa entre aplicaciones ni una base de datos deportiva
compartida. Los paquetes comunes dependen solo de APIs de plataforma o de otros
paquetes comunes de nivel inferior; nunca importan desde `apps/`.

## Árbol definitivo de fundación

```text
hartico-sports/
├── apps/
│   ├── racing/
│   │   ├── src/
│   │   │   ├── app/
│   │   │   └── domain/
│   │   └── supabase/
│   │       ├── migrations/
│   │       └── tests/
│   ├── football-lite/
│   │   └── (misma frontera, dominio propio)
│   └── tennis/
│       └── (misma frontera, dominio propio)
├── packages/
│   ├── auth/
│   ├── database/
│   ├── shared/
│   └── ui/
├── docs/
├── tooling/
├── AGENTS.md
├── package.json
└── tsconfig.base.json
```

No se crea todavía `packages/admin`: navegación administrativa, permisos y
operaciones son inicialmente propiedad de cada aplicación. Cuando dos productos
tengan flujos equivalentes, se extraerán primitivas visuales o contratos; nunca
reglas deportivas. Esto evita fijar una abstracción a partir de un solo caso.

## Capas por aplicación

Cada feature futura sigue esta dirección de dependencias:

```text
UI / route
    ↓
application use case
    ↓
domain types and rules ← pure tests
    ↓
repository interface
    ↓
Supabase adapter
```

En una feature pequeña estas capas pueden ser carpetas o archivos, no clases ni
frameworks. La regla importante es que la regla deportiva sea testeable sin DOM
ni Supabase y que el acceso remoto no quede disperso en componentes.

## Responsabilidad de los paquetes

### `@hartico/ui`

Tokens, layout, feedback, botones, campos, modal accesible y tabla genérica. No
incluye nombres de rutas, menú de un deporte, tablas de clasificación ni
branding HFA. Los productos inyectan tema mediante variables CSS y configuración.

### `@hartico/shared`

Tipos y funciones puras sin I/O: configuración de producto, IDs opacos,
fechas/formatos neutros y resultados tipados. Una temporada se puede representar
como capacidad opcional; no se obliga a todas las entidades a tener `season_id`.

### `@hartico/auth`

Contratos de sesión, perfil y capacidades; guards de UI y adaptador futuro de
Supabase Auth. La UI puede orientar al usuario, pero RLS/RPC vuelve a comprobar
toda autorización. Los roles concretos se declaran en cada aplicación.

### `@hartico/database`

Creación/configuración segura del cliente, manejo uniforme de errores y tipos
comunes de infraestructura. No contiene un repositorio universal de deportes ni
migraciones compartidas que se ejecuten mágicamente en todos los proyectos.

## Dominios deliberadamente separados

- Racing usa eventos, sesiones, parrilla, vueltas, clasificaciones y estados de
  resultado propios.
- Football Lite usa partidos, equipos, plantillas e incidencias de fútbol.
- Tennis usa torneos, cuadros, rondas, partidos y sets.

`football_match`, `race_session` y `tennis_match` no heredan de un `sport_event`
persistido. Pueden compartir conceptos de presentación (fecha, estado visible,
enlace) mediante read models locales, no mediante una tabla universal.

## Estado y acceso a datos

- Estado de formulario y UI: estado React local.
- Estado remoto: hooks/repositories por feature. Se evaluará TanStack Query solo
  cuando Racing tenga invalidación/caché asíncrona suficiente para justificarla.
- Estado global: reservado para sesión, tema y configuración del producto.
- Mutaciones críticas: RPC transaccional o Edge Function; después se refresca el
  read model autoritativo.
- Lectura pública: vistas explícitas que omiten PII y campos operativos.
- No se implementa offline ni caché persistente en la fundación.

## Routing y administración

Cada app posee su router y mapa de navegación. El shell compartido recibe items
ya autorizados; no conoce rutas deportivas. React Router se añadirá a Racing al
crear la segunda pantalla real, evitando una dependencia sin uso en el bootstrap.

Administración es una superficie por capacidades, no un rol omnipotente en el
frontend. Las operaciones de alto impacto ofrecen preview, confirmación,
auditoría y resultado identificable.

## UI, formularios y branding

Los tokens comunes definen semántica (`surface`, `text`, `accent`, `danger`) y
accesibilidad. Cada app suministra valores de marca. Football Lite aceptará en
el futuro una configuración validada como:

```ts
type AssociationBranding = {
  associationId: string;
  name: string;
  acronym: string;
  logoUrl?: string;
  theme: { primary: string; accent: string };
};
```

La configuración no autoriza acceso: `association_id` se deriva de membresías y
claims confiables, nunca de un selector enviado por el cliente.

## Migraciones, pruebas y observabilidad

- Cada app tiene migraciones inmutables, ordenadas y autocontenidas.
- Toda tabla expuesta habilita RLS en la misma migración que la crea.
- Cada RPC `security definer` fija `search_path`, valida actor y revoca ejecución
  pública salvo concesión explícita.
- Las pruebas SQL cubren acceso anon/auth/roles y aislamiento entre tenants.
- Las reglas de dominio tienen unit tests; repositories tienen integración local;
  los flujos críticos tienen e2e cuando existe producto navegable.
- Los logs usan códigos estables y metadatos allow-listed; nunca tokens, emails o
  payloads completos.

## Criterios para compartir código

Una extracción a `packages/` requiere:

1. dos consumidores reales o una capacidad inequívocamente transversal;
2. semántica idéntica, no solo nombres parecidos;
3. API menor que las implementaciones sustituidas;
4. pruebas independientes del deporte;
5. posibilidad de versionar el cambio sin coordinar datos entre productos.

Si falla un criterio, la duplicación pequeña y explícita es preferible.

## Decisiones tecnológicas

| Decisión | Elección | Motivo |
|---|---|---|
| Lenguaje | TypeScript estricto | Contratos claros y refactors seguros desde el inicio. |
| UI | React | Ecosistema estable y composición adecuada para admin/público. |
| Build | Vite | Desarrollo y builds simples para SPAs independientes. |
| Workspace | npm workspaces | npm ya está disponible; evita instalar pnpm solo por preferencia. |
| Orquestador | Ninguno | Tres apps pequeñas no justifican Turborepo todavía. |
| Backend | Supabase/PostgreSQL | Auth, RLS, Storage, RPC y experiencia operativa existente. |
| CSS | Tokens + CSS normal compartido | Pocas dependencias y control de marca. |
| Estado | React local + repositorios | No hay evidencia para un store global. |

## Triggers de reevaluación

- Adoptar pnpm si el tiempo/espacio de instalación se vuelve un problema medido.
- Adoptar Turborepo si CI necesita caché y un grafo de tareas que npm no resuelve.
- Extraer `packages/admin` después del segundo flujo administrativo equivalente.
- Añadir una librería de queries cuando Racing tenga múltiples recursos remotos
  con invalidación real.
- Separar un tenant Football Lite a proyecto dedicado si exige backup, región,
  SLO o personalización operativa independiente.
