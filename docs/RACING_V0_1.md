# Racing / Formula v0.1

Este es el siguiente paso recomendado. El trabajo no forma parte del bootstrap
actual y debe comenzar con aprobación explícita.

## Resultado buscado

Un vertical slice que permita a cualquier visitante consultar una temporada y
su calendario, pilotos, escuderías y circuitos, mientras un administrador puede
mantener esos catálogos de forma segura y auditada.

## Alcance propuesto

### Incluido

- temporada (`draft`, `published`, `archived`);
- piloto con identidad pública mínima;
- escudería y membresía de piloto efectiva por temporada;
- circuito;
- Gran Premio/round con circuito, fechas, orden y estado;
- páginas públicas de calendario y directorios;
- login y capacidades admin;
- CRUD admin mínimo con validación, auditoría y RLS;
- branding propio de Racing;
- datos ficticios locales para desarrollo y tests.

### No incluido todavía

- prácticas, sprint, qualifying, parrilla y carrera;
- vueltas, tiempos, sectores o telemetría;
- resultados, DNS/DNF/DSQ y penalizaciones;
- puntos, standings o reglamentos históricos;
- récords, museo y awards;
- feeds externos/importadores;
- deploy o Supabase remoto.

Limitar v0.1 a catálogos y calendario permite probar arquitectura, auth, RLS,
migraciones, UI y administración antes de congelar el modelo complejo de sesión
y resultados.

## Secuencia de inicio

1. Aprobar términos: `season`, `driver`, `constructor`, `circuit`, `grand_prix`.
2. Decidir si el producto representa un campeonato ficticio, real o ambos; esto
   afecta licencias, fuentes, IDs y datos permitidos.
3. Escribir un ADR del modelo v0.1 y un diagrama de amenazas.
4. Inicializar Supabase CLI local dentro de `apps/racing/supabase`.
5. Crear la primera migración autocontenida con RLS deny-by-default.
6. Añadir tests SQL anon/admin y seed ficticio.
7. Implementar repositorios tipados y read models públicos.
8. Crear rutas públicas y luego el flujo admin mínimo.
9. Ejecutar tests, typecheck y build; documentar el runbook.

## Esquema conceptual, no SQL definitivo

```text
seasons
constructors
drivers
season_entries (season + driver + constructor + car_number)
circuits
grand_prix_events (season + circuit + round + dates + status)
profiles
role_memberships
audit_events
```

`season_entries` evita sobrescribir la escudería o número histórico del piloto.
Los nombres finales, constraints y estrategia de slugs se deciden en el ADR.

## Criterios de aceptación

- un visitante solo ve temporadas/eventos publicados;
- admin puede crear/editar sin DML directo inseguro;
- usuario no admin no puede mutar ni inferir datos de draft;
- RLS se prueba contra anon, authenticated y admin;
- no hay secretos en frontend ni fixtures reales sin licencia confirmada;
- reglas de dominio no importan React ni Supabase;
- accesibilidad básica por teclado y responsive verificada;
- `npm run typecheck` y `npm run build` pasan;
- ninguna modificación en HFA ni recurso remoto.

## Decisiones que requieren al propietario

- nombre público definitivo: Racing, Formula u otro;
- campeonato real vs. ficticio y política de datos/logos;
- idiomas iniciales;
- quiénes son los primeros administradores;
- si v0.1 debe incluir una sesión de carrera sin resultados o esperar a v0.2.
