# Auditoría de HFA

Fecha de corte: 2026-09-17  
Repositorio inspeccionado: `C:\hfa`  
Rama y estado observados: `main`, limpia y alineada con `origin/main`  
Último commit observado: `09baaf9 test(db): verify baseline equivalence`

La auditoría fue de solo lectura. No se modificaron archivos, Git, Supabase,
variables, despliegues ni recursos remotos de HFA.

## Resumen ejecutivo

HFA es una SPA madura de HTML, CSS y JavaScript nativo, sin bundler ni
`package.json`. El navegador usa Supabase Auth/Postgres/Storage y una Edge
Function. El backend concentra una parte importante de la integridad en RLS,
vistas de lectura, RPC, triggers, snapshots y auditoría.

La experiencia transferible es principalmente arquitectónica:

- dato público proyectado por vistas seguras;
- overlays privados según rol sin cambiar la semántica pública;
- mutaciones sensibles mediante RPC pequeñas y transaccionales;
- autoridad del servidor seguida de refetch, no estado optimista permanente;
- historial y resultados derivados congelados cuando deben ser reproducibles;
- ledger de migraciones, verificadores y pruebas de contratos;
- caché secundaria particionada por identidad y limpieza al cerrar sesión.

No conviene copiar la implementación completa. La UI basada en manipulación DOM,
el acceso a datos distribuido y el esquema acumulado están demasiado ligados a
HFA y a su historia.

## Evidencia e inventario

### Frontend

- `index.html` es el shell principal y contiene gran parte de la estructura UI.
- `js/app.js` realiza bootstrap y render global.
- `js/router.js` implementa History API, rutas limpias, aliases y rutas
  dinámicas.
- `js/state.js` mantiene un modelo normalizado en memoria.
- `js/cloud.js` carga vistas públicas, añade overlays privados y normaliza.
- `js/auth.js` gestiona sesión, roles y transición a estado público.
- `js/services/sports-data.js` expresa contratos canónicos de jugador, partido y
  competición.
- Los módulos de página viven en `js/modules/`; servicios en `js/services/` y
  utilidades en `js/utils/`.
- Hay 55 archivos que tocan DOM o globales directamente y, solo en `app.js` y
  `js/modules/`, más de cien asignaciones a `innerHTML` o globals. Esto indica
  fuerte acoplamiento UI/runtime.
- El CSS creció por capas (`styles`, `components`, `enterprise`, `premium`,
  estabilizaciones y estilos por feature), con riesgo de cascada y overrides.
- La persistencia local es secundaria y se separa por namespace público o
  `role:user-id`.

### Rutas y módulos

El router cubre áreas públicas y administrativas: temporadas, equipos,
jugadores, transferencias, competiciones, partidos, estadísticas, premios,
árbitros, historial, contenido, configuración y cuenta. Conserva aliases
históricos y algunas superficies solapadas, por ejemplo jornadas/copas frente
al detalle canónico de competición y el detalle de equipo abierto como modal.

Los formularios, modales, tablas, menús y navegación muestran patrones útiles,
pero están implementados en DOM/CSS global y no son componentes portables. Debe
reutilizarse su comportamiento esperado, no copiar su código.

### Backend y datos

El baseline canónico `HFA_BASELINE_2_0.sql` mide aproximadamente 901 KB. Su
manifest declara:

| Objeto | Cantidad |
|---|---:|
| Tablas | 78 |
| Columnas | 956 |
| Constraints | 109 |
| Índices | 105 |
| Funciones | 302 |
| Triggers | 100 |
| Vistas | 14 |
| Políticas | 135 |
| Seeds estructurales | 17 |

Las 78 tablas tienen RLS habilitado en el baseline. Hay vistas con
`security_barrier`, entre ellas proyecciones públicas y overlays administrativos
para equipos, jugadores, árbitros, partidos y estadísticas. Los roles base son
`ADMIN`, `REFEREE`, `TEAM` y `VIEWER`, con cuentas de jugador derivadas de
vínculos activos.

El dominio incluye temporadas, plantillas históricas, competiciones, grupos,
eliminatorias, partidos, eventos, estadísticas, transferencias, awards,
revisiones y snapshots. También incluye capacidades específicas no deportivas:
contenido, HFA Club, cartas, packs, créditos, predicciones, Social y Biblia.

La única Edge Function vigente, `invite-referee`, comprueba al actor, utiliza un
cliente privilegiado solo en servidor, compensa fallos parciales y registra
auditoría. Es un patrón conceptual válido, pero su implementación y roles son
específicos de HFA.

### Migraciones y pruebas

- El baseline 2.0 absorbe el historial hasta la migración 063.
- El stream futuro vive en `sql/migrations/v2/` y tiene ledger explícito.
- Existen scripts para construir y comparar el baseline y verificadores SQL.
- La suite Node tiene más de doscientas pruebas de contrato. Muchas validan
  archivos por texto/regex o ejecutan fragmentos en `vm`; son útiles como red de
  regresión de un legacy, pero no sustituyen integración real con Postgres/RLS,
  pruebas de componentes ni flujos end-to-end.

## Clasificación de piezas

### 1. Específicas de HFA

- Modelo de partido de fútbol, goles/autogoles, acta arbitral y ratings.
- Competiciones, grupos, llaves, progresión y lógica de DEFAULT de HFA.
- Plantillas, transferencias y elegibilidad concreta de jugadores.
- HFA Club, cartas, monedas/créditos, packs, mercados y predicciones.
- Biblia del 2C, Social, publishers, promociones y sistema editorial.
- Branding, assets, copy, navegación y roles `REFEREE`/`TEAM` actuales.
- Fórmulas de rating, valor de jugador, team strength y awards automáticos.

Estas piezas no se copian a Hartico Sports.

### 2. Potencialmente reutilizables como concepto

- Separación entre proyección pública y overlay privado.
- Autenticación, perfil mínimo y cierre de sesión seguro.
- Roles/permisos expresados como capacidades y verificados en servidor.
- Auditoría append-only para operaciones sensibles.
- Validación de archivos y carga a Storage con políticas por ruta/propietario.
- Configuración visual, navegación base, tablas, modales y formularios
  accesibles.
- Temporadas como contexto opcional, nunca obligación universal.
- Convenciones de migración inmutable, ledger, verifier y smoke data.
- Snapshots/versionado para resultados históricos reproducibles.

Se reimplementan con TypeScript, componentes y pruebas, sin copiar código.

### 3. Reutilizables con refactor o rediseño

- `sports-data.js`: separar read models por dominio; no crear un contrato
  `sport_event` universal.
- `cloud.js`: reemplazar el gateway grande por repositorios/adaptadores pequeños
  propiedad de cada feature.
- `state.js`: mantener estado servidor en una capa de consultas y estado UI
  local; evitar un store global mutable para todo.
- `auth.js`: compartir sesión y guards, pero cada app declara su matriz de
  capacidades.
- helpers de formato, logger allow-listed, borradores e image upload: convertir
  en módulos puros con interfaces, límites de tamaño/MIME y pruebas.
- tokens CSS y shell responsive: extraer semántica visual, no reglas HFA.
- auditoría, archivo y revisiones: patrón común de infraestructura con payloads
  específicos por dominio.

### 4. No recomendables para reutilizar

- Copiar `index.html`, módulos que generan HTML o handlers globales.
- Copiar el baseline o reproducir las 78 tablas en los productos nuevos.
- Acceso directo a Supabase desde numerosos módulos de UI.
- Vendorización manual de librerías cuando existe gestión normal de paquetes.
- Aliases/rutas legacy, modales usados como páginas y superficies duplicadas.
- Mezclar configuración, contenido editorial y reglas deportivas en el mismo
  núcleo.
- Roles como strings usados solo para mostrar/ocultar UI sin autorización del
  servidor.

### 5. Deuda que no debe viajar

- Baseline grande nacido de 63 migraciones y múltiples hotfixes.
- Demasiadas funciones/triggers para comprender una operación de punta a punta.
- CSS acumulativo por capas de corrección.
- Estado y render global, uso intensivo de `innerHTML` y globals.
- Tests estructurales basados en regex como defensa principal.
- Nomenclatura HFA incrustada en objetos genéricos y roles.
- Código duplicado entre agregadores y detalles de competición.
- Dependencia de caché local compleja antes de demostrar necesidad offline.

## Conclusión aplicable

Hartico Sports debe comenzar pequeño, tipado y por dominio. Compartirá
primitivas de UI e infraestructura, pero cada app tendrá su propio modelo,
migraciones, RLS y ciclo de despliegue. La adopción de una pieza de HFA será una
reimplementación deliberada respaldada por un segundo consumidor real.
