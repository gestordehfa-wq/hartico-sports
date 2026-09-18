# Estrategia Supabase canónica

Estado: decisión vigente desde 2026-09-18. Reemplaza la propuesta anterior de
un proyecto Supabase por deporte.

## Decisión

Hartico Sports usa un único proyecto Supabase Cloud llamado `hartico-sports`:

```text
auth.*       identidad compartida
racing.*     datos y autorización de Racing
football.*   datos y autorización de Football Lite
tennis.*     datos y autorización de Tennis
```

No se crean entidades deportivas en `public`. Los nombres iguales (`seasons`,
`players`, `teams`, `matches`, `role_memberships`, `audit_events`, `is_admin`)
no colisionan porque todos los objetos y referencias internas están
cualificados por schema. No existen claves foráneas entre deportes.

La auditoría de nombres encontró estas colisiones intencionales:

| Objeto | Schemas |
|---|---|
| `role_memberships`, `seasons`, `audit_events` | racing, football, tennis |
| `teams` | racing, football |
| `players`, `matches`, `awards` | football, tennis |
| `is_admin`, `current_user_is_admin` | racing, football, tennis |
| `touch_updated_at`, `capture_audit` | football, tennis |

Todas se resuelven por nombre cualificado. Los índices, constraints y triggers
quedan asociados a relaciones dentro del schema propietario.

La infraestructura Cloud es compartida, pero cada aplicación conserva su
frontera de dominio, cliente, tipos, RLS, funciones y auditoría. HFA no forma
parte de este proyecto y permanece intacto.

## Auth, roles y perfiles

Los tres productos autentican contra el mismo `auth.users`. Un UUID puede tener
una membresía independiente en cero, uno o varios schemas:

```text
racing.role_memberships
football.role_memberships
tennis.role_memberships
```

Cada `racing.is_admin`, `football.is_admin` y `tennis.is_admin` consulta solo su
tabla. Ser admin en un producto no concede capacidades en otro. No existe un
rol universal.

Se eliminó `racing.profiles`: no tenía un consumidor y solo duplicaba datos
básicos de Auth. Football y Tennis tampoco crean perfiles. La sesión de Auth es
la fuente de identidad; si un producto necesita más adelante datos propios de
perfil, añadirá una tabla dentro de su schema mediante una migración nueva.

## RLS y funciones

Todas las tablas expuestas habilitan RLS al crearse. La matriz base es:

| Actor | Lectura publicada | Lectura autenticada | Escritura deportiva | Auditoría |
|---|---:|---:|---:|---:|
| `anon` | Sí | No | No | No |
| `authenticated` normal | Sí | Sí | No | No |
| admin del producto | Sí | Sí | Solo su producto | Solo lectura |

Las funciones privilegiadas usan `security definer`, fijan `search_path`,
referencian objetos cualificados y tienen grants explícitos. Los triggers no
son RPC públicas. Cada producto conserva su propia tabla append-only
`audit_events` con actor, acción, entidad, id, estado anterior/posterior y fecha.

## Data API

Las migraciones conceden `USAGE` de cada schema a `anon` y `authenticated`.
Tablas, vistas y RPC reciben permisos explícitos; las tablas sensibles no
reciben grants de escritura. Los default privileges revocan por defecto acceso
a tablas, secuencias y funciones para `public`, `anon` y `authenticated`.

Los UUID usan `extensions.gen_random_uuid()`. Las secuencias identity de
auditoría no necesitan grants cliente porque solo escriben triggers propietarios.

Supabase no expone schemas personalizados automáticamente. En Dashboard se
deben configurar como únicos schemas deportivos expuestos:

```text
racing
football
tennis
```

No se debe añadir `public` solo por compatibilidad ni exponer `auth`,
`extensions` u otros schemas internos.

## Historial único de migraciones

El proyecto remoto tiene un solo ledger. Las fuentes continúan junto a cada
dominio en `apps/<producto>/supabase/migrations`, pero solo la raíz `supabase/`
se enlaza o publica.

`tooling/assemble-supabase.mjs` genera nombres globalmente ordenados en
`supabase/migrations` y copia los tests de dominio a `supabase/tests`.
`npm run supabase:check` falla si una copia se editó, falta o apareció SQL no
registrado. Así se conserva propiedad por app sin ejecutar tres `db push` con
historias incompatibles.

Flujo para un cambio futuro:

1. añadir una migración nueva al dominio propietario;
2. registrarla en el ensamblador con un timestamp global nuevo;
3. ejecutar `npm run supabase:assemble`;
4. revisar `npm run supabase:check` y los quality gates;
5. hacer un único dry-run y un único push desde la raíz, tras aprobación.

Las migraciones ya aplicadas no se editan.

## Clientes y variables

Los clientes fijan el schema en código, no mediante una variable de entorno:

```text
Racing        db.schema = racing
Football Lite db.schema = football
Tennis        db.schema = tennis
```

Los tres pares URL/key apuntarán al mismo proyecto, aunque conservan prefijos
por producto para reducir errores de configuración en Vercel:

```text
VITE_RACING_SUPABASE_URL
VITE_RACING_SUPABASE_ANON_KEY
VITE_FOOTBALL_SUPABASE_URL
VITE_FOOTBALL_SUPABASE_ANON_KEY
VITE_TENNIS_SUPABASE_URL
VITE_TENNIS_SUPABASE_ANON_KEY
```

Nunca se usan `service_role`, secret keys, contraseña de base o JWT secret en
el frontend.

## Límites operativos

Compartir proyecto implica cuota, backup, región y ventana de mantenimiento
comunes. El aislamiento implementado es lógico y de autorización, no físico.
Se mantienen tres proyectos Vercel (`hartico-racing`, `hartico-football`,
`hartico-tennis`) y tres dominios futuros, pero no se configuran en esta fase.

No se ha enlazado la CLI, aplicado SQL remoto, modificado Auth ni desplegado.
