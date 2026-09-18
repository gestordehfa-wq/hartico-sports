# Tennis v0.1

Estado: implementación local completa; conexión a Supabase Cloud y ejecución pgTAP pendientes de un proyecto objetivo aprobado.

## Producto

Tennis es una aplicación independiente para singles. Gestiona temporadas, jugadores, torneos históricos, ediciones, inscripciones/seeds, cuadros single elimination, partidos, sets, resultados, ranking estacional, H2H, estadísticas, palmarés y awards. No reproduce ATP/WTA ni utiliza APIs externas.

La aplicación abre sin backend y muestra estados vacíos honestos. No exige Docker, WSL, PostgreSQL ni Supabase local:

```powershell
npm install
npm run dev:tennis
```

## Reglas v0.1

- Una sola temporada puede estar activa.
- Singles únicamente; no existen equipos o dobles.
- Superficies: dura, arcilla, césped, indoor y personalizada.
- Categorías: major, masters, standard, finals y custom.
- Cuadros: 4, 8 o 16, eliminación simple y seeds únicas.
- Formato: `best_of` configurable en 1, 3 o 5; scores manuales por set.
- La confirmación administrativa determina el ganador por mayoría de sets y lo propaga de forma transaccional.
- Walkover/retiro se representan con ganador explícito y la misma confirmación lo propaga; la determinación automática por sets corresponde a partidos normales.
- Ranking por temporada, derivado solo de ediciones completadas.
- Desempates: puntos, títulos, finales y nombre visible, en ese orden.

## Ranking

Las reglas se administran por categoría y última ronda ganada. Los defaults son Major 1000/600/360, Masters 500/300/180 y Standard 250/150/90 para campeón/finalista/semifinalista. Finals incluye 750/450/270; Custom empieza en cero. Son defaults operativos, no valores oficiales.

El ranking muestra posición, jugador, puntos, torneos disputados y títulos. No se edita como fuente primaria.

## UI y rutas

Classic Windows Enterprise UI: navegación compacta, toolbar, title bars, paneles rectangulares, tablas densas, formularios y diálogos. El cuadro horizontal de 4/8/16 es propio y no añade una librería de brackets.

Rutas públicas: `/`, `/tournaments`, `/tournaments/:id`, `/draws`, `/players`, `/players/:id`, `/players/:id/h2h/:opponentId`, `/h2h`, `/matches`, `/matches/:id`, `/ranking`, `/stats` y `/history`.

Rutas admin: `/admin`, recursos CRUD bajo `/admin/:resource` y herramienta con preview en `/admin/draw`.

## White-label

`src/config/association.ts` concentra nombre, acronym, holo, logo, colores y etiqueta de temporada. `.env.example` documenta overrides `VITE_*`; no contiene secretos.

## Seguridad y datos

Las migraciones viven en `apps/tennis/supabase`. Toda tabla expuesta habilita RLS en su creación. `anon` lee publicación, `authenticated` lee y `admin` administra. Las funciones privilegiadas verifican actor, fijan `search_path`, limitan grants y generan auditoría before/after.

No se creó, vinculó o modificó ningún proyecto Cloud. HFA permaneció sin tocar.

## Shared UI

La tercera app confirmó semántica común para `WindowPanel`, `StatusBadge`, `EmptyState`, `LoadingPanel`, `DataGrid` y tokens Classic base. Se extrajeron a `@hartico/ui`; Football Lite consume las primitivas equivalentes y Racing/Football usan los tokens compartidos con sus acentos propios. Navegación, layout y widgets deportivos siguen locales.

## Validación

Los tests TypeScript cubren tamaños/seeds/duplicados/estructura del draw, resultado/sets/avance, ranking/desempates, H2H y estadísticas. Los tests SQL cubren constraints, RLS positiva/negativa, separación de actores, antipromoción y auditoría. Los SQL quedan preparados sin hacer obligatorio PostgreSQL local.

## Próxima decisión

No se inicia automáticamente. Debe elegirse entre Racing v0.2 (Qualifying & Race), conexión/configuración Supabase Cloud de los tres productos o refinamiento visual conjunto.
