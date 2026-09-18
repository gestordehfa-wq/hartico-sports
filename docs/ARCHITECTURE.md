# Arquitectura de Hartico Sports

## Vista general

Hartico Sports es un monorepo con tres aplicaciones desplegables y dominios
independientes. Comparten componentes e infraestructura transversal, pero no
modelos deportivos:

```text
apps/racing -----------┐
apps/football-lite ----+--> packages/*
apps/tennis -----------┘

                           Supabase Cloud: hartico-sports
                         ┌──────────┬──────────┬─────────┐
shared auth.users ------>│ racing.* │football.*│ tennis.*│
                         └──────────┴──────────┴─────────┘
```

Una app puede importar paquetes; los paquetes no importan apps y una app no
importa otra. `football.matches`, `racing.grand_prix_events` y
`tennis.matches` no derivan de una entidad universal.

## Capas por aplicación

```text
UI / ruta
  -> caso de uso
  -> reglas y tipos de dominio puros
  -> repositorio del producto
  -> cliente Supabase fijado al schema del producto
```

React no contiene reglas deportivas ni llamadas Supabase dispersas. La sesión
Auth es común, pero cada contexto consulta el RPC `current_user_is_admin` de su
schema y el servidor vuelve a autorizar cada operación con RLS.

## Base de datos

La separación física por proyecto fue reemplazada por separación PostgreSQL:

- `racing`: temporadas, pilotos, equipos, inscripciones, circuitos y GP;
- `football`: temporadas, competiciones, equipos, jugadores, partidos,
  standings y estadísticas;
- `tennis`: temporadas, jugadores, torneos, ediciones, cuadro, sets, ranking y
  H2H;
- `auth`: identidad compartida administrada por Supabase.

Cada schema tiene `role_memberships`, `is_admin` y `audit_events` propios. No
hay roles globales, tablas deportivas en `public` ni referencias cruzadas.

## Migraciones

Los archivos de `apps/*/supabase/migrations` son fuentes por dominio. La raíz
`supabase/migrations` es el artefacto ordenado que consume la única
configuración CLI. El ensamblador determinista y `supabase:check` evitan drift.
Nunca se enlazan las carpetas de app ni se hacen tres pushes al mismo proyecto.

## Paquetes compartidos

- `@hartico/ui`: primitivas accesibles y shell sin reglas deportivas.
- `@hartico/shared`: utilidades puras transversales.
- `@hartico/auth`: contratos de sesión/capacidades, no roles universales.
- `@hartico/database`: configuración pública y errores, no repositorios de
  deportes.

Una abstracción requiere dos consumidores con semántica equivalente o una
capacidad inequívocamente transversal.

## Seguridad

- RLS en toda tabla expuesta desde su creación.
- Grants y `USAGE` explícitos; default privileges deny-by-default.
- `security definer` con `search_path` fijo, objetos cualificados y grants
  mínimos.
- Auditoría append-only por producto.
- Ningún secreto privilegiado en variables `VITE_*`.
- Tests pgTAP positivos, negativos y de aislamiento cruzado.

## Despliegue

Un repositorio GitHub alimentará tres proyectos Vercel con roots distintos. Los
tres usan la misma URL/key pública de Supabase, pero sus schemas están fijados
en código. Los dominios futuros son `racing.hfa.bar`, `football.hfa.bar` y
`tennis.hfa.bar`; configurarlos no forma parte de esta fase.

HFA (`C:\hfa`) es externo, estable y de solo lectura.
