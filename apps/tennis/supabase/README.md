# Supabase — Tennis

Este directorio prepara un proyecto Cloud independiente para Tennis. Las migraciones se aplican en orden sobre un destino revisado (por ejemplo `hartico-tennis`); no requiere Docker, WSL ni PostgreSQL local para desarrollar el frontend.

1. Revisar que el proyecto no pertenezca a Racing, Football Lite ni HFA.
2. Aplicar `migrations/*.sql` en orden.
3. Crear un usuario con Supabase Auth.
4. Como propietario de base, insertar su UUID en `role_memberships` con rol `admin`.
5. Configurar `apps/tennis/.env.local` desde `.env.example`.

Los SQL tests usan pgTAP y quedan listos para CI/staging cuando exista un runner PostgreSQL aprobado. Ninguna clave `service_role` pertenece al frontend.
