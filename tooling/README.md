# Tooling

Configuración transversal mínima. Antes de añadir un orquestador, generador o
wrapper, documentar el problema medido que npm workspaces y los scripts de cada
app no resuelven.

`assemble-supabase.mjs` es la excepción operativa necesaria: reúne las fuentes
SQL de los tres dominios en el único historial de migraciones del proyecto
`hartico-sports` y verifica que las copias versionadas no tengan drift.
