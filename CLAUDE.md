# EASYBUS · API (NestJS + PostgreSQL/PostGIS)

API de EASYBUS, fase 1: transporte fluvial Businú (embarcaderos del río Sinú, Montería).
Prefijo `/api/v1`, errores `{ statusCode, code, message }`. Textos en español.

## Forma de trabajar (reglas del usuario)

- Prioridad: terminar la funcionalidad para que el usuario la pruebe.
- Pruebas solo para lógica importante (próxima salida, tipo de día, festivos, caché) y
  para los errores que se corrijan. Máximo 1 a 3 pruebas nuevas por tarea.
- Ejecutar solo las pruebas del archivo cambiado. La suite completa, una sola vez antes
  del commit.
- Si una prueba falla 2 veces seguidas: detenerse y explicar, no seguir intentando.
- Para diagnosticar errores, usar llamadas directas (curl), no pruebas.
- Explicar los cambios y esperar confirmación antes de commit/push.

## Datos

- Nunca crear, modificar ni borrar datos de la base real `easybus`, ni temporalmente
  (la tabla `auditoria` debe tener solo cambios reales del administrador).
- Pruebas que escriben datos: base aparte `easybus_prueba` y otra instancia de la API,
  p. ej. `PORT=3001 DB_NAME=easybus_prueba node dist-seed/main.js`.
- Pruebas de solo lectura (GET) pueden ir contra la API real del puerto 3000.
- No subir el límite del throttler para resolver errores 429: reducir peticiones.

## Comandos

- Pruebas unitarias: `npx vitest run ruta/al.spec.ts` (todas: `npm test`).
- e2e (necesita la base): `npx vitest run --config ./vitest.config.e2e.ts`.
- Lint: `npm run lint` (oxlint). Formato: Prettier (80 columnas).
