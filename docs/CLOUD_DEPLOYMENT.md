# Cloud deployment

Estado: **PARTIAL**. Proyecto `hartico-sports` (ref `hzxqgyxmunoqrsakqtje`)
vinculado y migrado; las 16 migraciones iniciales están aplicadas en Cloud;
las 7 suites SQL (158 assertions) pasan contra Cloud; las tres apps leen datos
reales de Cloud en las rutas documentadas. Pendiente: verificación de login y
CRUD vía UI con las identidades Auth ya existentes (bloqueada en esta sesión
por no disponer de las credenciales ni poder revelar el `service_role` para
resetearlas; ver "Estado de verificación Cloud" más abajo).

## Topología aprobada

| Producto | Supabase | Schema | Vercel | Root Directory |
|---|---|---|---|---|
| Racing | `hartico-sports` | `racing` | `hartico-racing` | `apps/racing` |
| Football Lite | `hartico-sports` | `football` | `hartico-football` | `apps/football-lite` |
| Tennis | `hartico-sports` | `tennis` | `hartico-tennis` | `apps/tennis` |

Solo existe una configuración CLI en `supabase/config.toml`. No usar las
carpetas `apps/*/supabase` como workdir remoto.

## Preparación local

```powershell
npm run supabase:assemble
npm run supabase:check
npm run typecheck
npm run lint
npm run test
npm run build
```

El ensamblador produce un historial global: primero Racing, después Football y
Tennis, con timestamps únicos. El orden entre dominios no crea dependencias;
solo evita colisiones en el ledger del proyecto.

## Configuración manual requerida en Dashboard

Antes de cualquier migración:

1. Abrir el proyecto exacto `hartico-sports` y obtener su Project ref real.
2. En **Project Settings → API → Data API → Exposed schemas**, configurar
   exactamente `racing`, `football` y `tennis` como schemas deportivos.
3. No añadir `public`, `auth` o `extensions` para resolver errores de acceso.
4. Confirmar que se usará la Project URL y publishable/anon key del mismo
   proyecto en las tres aplicaciones.
5. En Auth URL Configuration, elegir una Site URL estable y añadir redirects
   explícitos para los tres productos y sus localhost. No usar un wildcard más
   amplio que los dominios propios.

La migración concede `USAGE`, permisos explícitos sobre tablas/vistas/RPC y
defaults restrictivos. Exponer un schema en Dashboard no sustituye RLS.

## Único enlace y única migración remota

No ejecutar todavía estos comandos. Cuando el Project ref haya sido revisado y
exista autorización expresa:

```powershell
npm run supabase:link -- --project-ref <HARTICO_SPORTS_PROJECT_REF>
npx supabase migration list --linked --workdir .
npm run supabase:push:dry-run
npm run supabase:push
npm run supabase:test:cloud
```

Verificar primero que el historial remoto sea compatible. Si contiene versiones
inesperadas, detenerse: no usar `migration repair`, no marcar versiones como
aplicadas y no empujar hasta revisar el estado real. El dry-run debe listar solo
los 16 archivos versionados en `supabase/migrations`. No ejecutar
`db reset --linked`, no incluir seeds y no hacer pushes separados por deporte.

## Primeros administradores

Auth es compartido. Crear cada usuario una sola vez y, desde SQL Editor con el
rol propietario, conceder únicamente las membresías necesarias:

```sql
begin;

insert into racing.role_memberships (user_id, role)
values ('<AUTH_USER_UUID>', 'admin')
on conflict (user_id) do update set role = excluded.role;

-- Repetir solo cuando corresponda:
-- insert into football.role_memberships (user_id, role) values (...) ...;
-- insert into tennis.role_memberships (user_id, role) values (...) ...;

commit;
```

No existe grant frontend para autoasignar membresías. Verificar con un usuario
normal y con admins exclusivos de cada producto.

## Variables Vercel

Los valores de URL/key serán iguales, pero cada proyecto recibe solo su par:

```text
hartico-racing
VITE_RACING_SUPABASE_URL
VITE_RACING_SUPABASE_ANON_KEY

hartico-football
VITE_FOOTBALL_SUPABASE_URL
VITE_FOOTBALL_SUPABASE_ANON_KEY

hartico-tennis
VITE_TENNIS_SUPABASE_URL
VITE_TENNIS_SUPABASE_ANON_KEY
```

No configurar `service_role`, secret key, contraseña PostgreSQL ni JWT secret.
El schema no es una variable: está fijado por producto en el cliente.

## Verificación posterior a una futura migración

- Ejecutar los siete tests SQL raíz, incluido `007_product_isolation.sql`.
- Confirmar lectura pública de contenido publicado en los tres schemas.
- Confirmar que un usuario autenticado normal no escribe en ninguno.
- Confirmar que cada admin escribe solo en su producto.
- Revisar `racing.audit_events`, `football.audit_events` y
  `tennis.audit_events`; no mezclar ni permitir escritura directa.
- Ejecutar smoke tests de las tres apps antes de configurar dominios.

## GitHub y Vercel

El repositorio remoto será único: `hartico-sports`. No hacer push sin
autorización. Importarlo tres veces en Vercel, habilitar acceso a fuentes fuera
del Root Directory para los workspaces y no configurar todavía los dominios
`racing.hfa.bar`, `football.hfa.bar` y `tennis.hfa.bar`.

## Estado de verificación Cloud (primera integración)

### Migraciones y schemas expuestos

- 16 migraciones locales == 16 migraciones remotas (`supabase migration list --linked`).
- Exposed schemas confirmados: `public`, `racing`, `football`, `tennis`.
  `public` se mantiene solo porque ya estaba expuesto; no se expone `auth`,
  `extensions` ni `storage`.

### Tests SQL Cloud (ejecutados vía `supabase db query --linked -f <archivo>`)

Método: `supabase test db --linked` sigue exigiendo Docker en este entorno, así
que se ejecutó cada suite con `supabase db query --linked -f <archivo>` (sin
Docker/WSL), envolviendo cada test en una tabla temporal transaccional para
capturar todas las líneas TAP (la Management API solo devuelve el último
resultado de un archivo multi-statement).

| Suite | Resultado |
|---|---|
| `001_racing_domain_constraints.sql` | 20/20 PASS |
| `002_racing_rls_audit.sql` | 34/34 PASS |
| `003_football_domain_constraints.sql` | 12/12 PASS |
| `004_football_rls_audit.sql` | 21/21 PASS |
| `005_tennis_domain_constraints.sql` | 21/21 PASS |
| `006_tennis_rls_audit.sql` | 20/20 PASS |
| `007_product_isolation.sql` | 30/30 PASS |
| **Total** | **158/158 PASS** |

Todas las suites hacen `rollback` al final; no dejan datos persistentes.

Correcciones aplicadas a los tests (no a migraciones publicadas):

1. Los fixtures de `seasons` asumían una base vacía. Cloud ya tiene una
   temporada `active` de smoke testing por producto, lo que violaba el índice
   único "una temporada activa". Se añadió, dentro de la misma transacción
   (revertida por `rollback`), `update <schema>.seasons set status = 'draft'
   where status = 'active';` antes de insertar el fixture.
2. Algunas aserciones contaban filas totales de una tabla asumiendo que solo
   existían las filas del fixture (`select count(*) from ...`). Con datos
   `Cloud Smoke` persistentes eso ya no es válido; se acotaron por los IDs del
   propio fixture (`racing.drivers`, `football.seasons`,
   `tennis.seasons`, `tennis.tournament_editions`).

### Auth

- Identidad admin (`auth-admin-*@hartico-sports.dev`) con exactamente 3
  memberships: `racing.role_memberships`, `football.role_memberships`,
  `tennis.role_memberships`, todas `admin`. Verificado por consulta SQL
  (no destructiva) en esta sesión.
- Identidad normal (`auth-normal-*@hartico-sports.dev`) con 0 memberships
  admin en los tres productos. Verificado igual.
- **Pendiente**: login real vía UI en las tres apps. No se dispone de la
  contraseña de ninguna identidad en esta sesión (no quedó persistida, como
  corresponde), y el intento de resetearla vía Management API (`supabase
  projects api-keys --reveal` para obtener `service_role`) fue bloqueado por
  el clasificador de seguridad del entorno (materialización de credenciales).
  Requiere que un humano aporte la contraseña o la resetee manualmente desde
  el Dashboard.

### RLS y auditoría

Cubiertas por las 158 assertions de las suites SQL (anon/authenticated/admin,
aislamiento por producto, `audit_events` con actor/acción/entidad/before/after,
DELETE bajo RLS verificado por filas afectadas, no solo status). Conteos
actuales de auditoría por producto en Cloud: racing 9, football 14, tennis 14
eventos — no se eliminó ninguno.

### Frontend Cloud (dev local contra Cloud)

Se levantaron las tres apps en sus puertos canónicos (Racing 5173, Football
5174, Tennis 5175) y se navegaron con Playwright + Microsoft Edge headless
(sin Docker/WSL), verificando el DOM renderizado tras la carga asíncrona (no
solo HTTP 200 del `index.html`):

- Racing: `/`, `/season`, `/drivers`, `/teams`, `/circuits`, `/calendar`,
  `/login`, `/admin` — las 8 rutas montan sin errores de consola fatales y
  muestran datos reales de Cloud (`Cloud Smoke mu7ewizx0je8r ...`).
- Football: `/`, `/competitions`, `/teams`, `/players`, `/matches`,
  `/standings`, `/stats`, `/history`, `/login`, `/admin` — 10 rutas OK.
- Tennis: `/`, `/tournaments`, `/draws`, `/players`, `/matches`, `/ranking`,
  `/stats`, `/history`, `/h2h`, `/login`, `/admin` — 11 rutas OK.

`/admin` sin sesión muestra el gate de autenticación (mismo contenido que
`/login`), comportamiento esperado.

**Pendiente**: login real y CRUD vía UI (bloqueado por el mismo motivo que
Auth arriba). CRUD administrativo (insert/update/delete con auditoría) ya está
verificado a nivel de datos/RLS por las suites SQL.

### Datos `Cloud Smoke`

Inventario confirmado (prefijo `mu7ewizx0je8r`) en los tres productos: una
temporada, más entidades mínimas por dominio (piloto/equipo/circuito/GP en
Racing; competición/equipos/jugadores/partido en Football; torneo/edición/4
jugadores en Tennis). **No se eliminaron** en esta sesión: son la única
evidencia visual actual de que el frontend lee Cloud correctamente, y la
verificación de CRUD/login vía UI sigue pendiente. Se recomienda limpiarlos
después de cerrar esa verificación, respetando el orden referencial y
preservando `audit_events`.

### Quality gates

`supabase:check`, `typecheck`, `lint`, `test` (16 tests, 3 apps) y `build`
(3 apps) — todos en verde.
