// Conexión que usa el CLI de TypeORM para generar, ejecutar y revertir migraciones
// (npm run migration:*). La API usa la misma configuración en app.module.ts.
// Se compila a dist-seed/ junto con el seed, por eso las rutas apuntan a archivos .js.

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { DataSource } from 'typeorm';

// Lee el .env sin sobrescribir variables ya definidas en la terminal
if (existsSync('.env')) process.loadEnvFile('.env');

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5432),
  database: process.env.DB_NAME,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  entities: [join(import.meta.dirname, '..', '**', '*.entity.js')],
  migrations: [join(import.meta.dirname, 'migrations', '*.js')],
  migrationsTableName: 'migraciones',
});
