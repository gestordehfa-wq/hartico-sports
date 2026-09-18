# Roadmap

El roadmap usa gates, no fechas artificiales. Cada fase termina con una decisión
verificable antes de ampliar alcance.

## Fundación — completada en este bootstrap

- auditoría read-only de HFA;
- límites entre core y dominios;
- elección de stack y workspaces;
- estrategia Supabase con aislamiento por producto;
- shells compilables de Racing, Football Lite y Tennis;
- paquetes comunes mínimos sin backend remoto;
- documentación operativa y repositorio Git local.

Gate: `npm run typecheck` y `npm run build` pasan; repositorio limpio.

## Racing / Formula v0.1 — completada

Objetivo: primer vertical slice público y administrable con temporada, pilotos,
escuderías, circuitos y Grandes Premios, sin clasificación avanzada ni telemetría.

Entregables completados:

1. glosario y reglas de alcance aprobadas;
2. modelo relacional mínimo y threat model;
3. Supabase local, migraciones, RLS y seed ficticio;
4. listado/detalle público de calendario y participantes;
5. autenticación admin y CRUD mínimo mediante operaciones auditadas;
6. tests de dominio, repositorio y políticas;
7. build y runbook local.

Gate: ver [RACING_V0_1.md](RACING_V0_1.md).

## Racing v0.2 — pospuesta

- exactamente dos intentos de clasificación por piloto;
- mejor tiempo válido calculado y parrilla derivada;
- carrera corta de 4 a 8 vueltas;
- una parada obligatoria a pits, registrada con su vuelta;
- resultados y estados `finished`, `dnf`, `dns` y `dsq`;
- validaciones deportivas específicas, sin tabla genérica de sesiones.

El flujo canónico es Gran Premio → clasificación → parrilla → carrera. Racing no
incorporará prácticas, sprint ni Q1/Q2/Q3. Puntos y standings quedan para un
incremento posterior, junto con penalizaciones, estadísticas, récords, museo y
awards.

Cada incremento debe cerrar un flujo completo antes de abrir el siguiente.

## Football Lite v0.1 — completada

Vertical independiente de fútbol, deliberadamente menor que HFA:

- branding white-label centralizado por despliegue;
- temporadas, competiciones, equipos, jugadores y plantillas históricas;
- partidos, apariciones, goles, asistencias y tarjetas;
- clasificación 3-1-0 y estadísticas básicas derivadas;
- historial, awards y consola CRUD protegida por rol admin;
- migraciones Supabase, RLS y auditoría preparadas para Cloud.

No se creó un backend compartido ni se importaron módulos de HFA. La conexión
Cloud queda como paso operativo explícito; el frontend compila y navega sin
Docker, WSL o PostgreSQL local. Ver [FOOTBALL_LITE_V0_1.md](FOOTBALL_LITE_V0_1.md).

## Tennis v0.1 — próxima fase recomendada

Comenzará con glosario y reglas: singles/doubles, formatos de sets, retiros,
walkovers, cuadros y ranking. Su modelo no derivará de Football Lite. No se
inicia Tennis hasta aprobar ese alcance.

## Capacidades transversales futuras

Se incorporan cuando un producto las necesita y un segundo confirma la semántica:

- upload de imágenes;
- data table avanzada;
- modal/form framework;
- auditoría UI;
- configuración white-label;
- observabilidad y error reporting;
- CI selectivo/caché de tareas;
- SSO, solo si surge un caso de negocio concreto.

## Fuera de alcance hasta nueva decisión

- migrar o refactorizar HFA;
- base de datos deportiva compartida;
- data warehouse global;
- app móvil nativa;
- CMS, apuestas, monedas o cartas;
- deploys y recursos remotos de producción.
