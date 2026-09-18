# Hartico Sports

Hartico Sports es la base para crear productos deportivos independientes que
comparten solo infraestructura genérica. No es una conversión de HFA ni un
monolito multideporte.

Estado actual: **Racing v0.1 implementado localmente** y shells mínimos para
Football Lite y Tennis. No existe conexión a Supabase remota ni despliegue.

## Principios

- Cada aplicación posee sus rutas, reglas, datos, migraciones y despliegue.
- Los paquetes compartidos no conocen carreras, partidos, sets ni entidades de
  un deporte.
- La base de datos y RLS son fronteras de seguridad, no detalles del frontend.
- Una abstracción entra en `packages/` únicamente después de demostrar uso real
  en más de una aplicación, salvo capacidades inequívocamente transversales.
- HFA permanece independiente y no se modifica desde este repositorio.

## Estructura

```text
apps/
  racing/          Primer producto; siguiente fase: Formula v0.1
  football-lite/   Producto de fútbol deliberadamente simple y white-label
  tennis/          Producto de tenis independiente
packages/
  auth/            Contratos y adaptadores de autenticación, sin roles deportivos
  database/        Creación de clientes y tipos de infraestructura
  shared/          Tipos/configuración/utilidades puras y genéricas
  ui/              Primitivas visuales accesibles y sin marca fija
docs/               Auditoría, arquitectura, estrategia y roadmap
tooling/            Configuración común mínima; no contiene lógica de producto
```

## Requisitos

- Node.js 24 LTS o una versión LTS compatible con la versión instalada de Vite.
- npm 11 o compatible.
- Docker Desktop o Podman para ejecutar Supabase local.

## Comandos

```bash
npm install
npm run supabase:racing:start
npm run supabase:racing:reset
npm run supabase:racing:test
npm run dev:racing
npm run typecheck
npm run lint
npm run test
npm run build
```

Los comandos `dev:football-lite` y `dev:tennis` levantan los otros shells.

## Documentación

- [Auditoría de HFA](docs/HFA_AUDIT.md)
- [Arquitectura](docs/ARCHITECTURE.md)
- [Estrategia Supabase](docs/SUPABASE_STRATEGY.md)
- [Límites de dominio](docs/DOMAIN_BOUNDARIES.md)
- [Roadmap](docs/ROADMAP.md)
- [Racing / Formula v0.1](docs/RACING_V0_1.md)

## Alcance de esta fundación

Este repositorio no contiene secretos, proyectos Supabase vinculados, datos de
producción, despliegues ni código copiado de HFA. La siguiente fase comienza
solo cuando se apruebe el alcance de Racing / Formula v0.1.
