import { join } from 'node:path';
import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { HealthModule } from './health/health.module.js';
import { AuthModule } from './auth/auth.module.js';
import { UsuariosModule } from './usuarios/usuarios.module.js';
import { RutasModule } from './rutas/rutas.module.js';
import { EmbarcaderosModule } from './embarcaderos/embarcaderos.module.js';
import { HorariosModule } from './horarios/horarios.module.js';
import { ReportesModule } from './reportes/reportes.module.js';
import { AuditoriaModule } from './auditoria/auditoria.module.js';
import { AdminModule } from './admin/admin.module.js';
import { PublicoModule } from './publico/publico.module.js';

@Module({
  imports: [
    // Lee el archivo .env y deja las variables disponibles en toda la app
    ConfigModule.forRoot({ isGlobal: true }),

    // Conexión a PostgreSQL + PostGIS usando las variables del .env
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST', 'localhost'),
        port: Number(config.get('DB_PORT', 5432)),
        database: config.get<string>('DB_NAME'),
        username: config.get<string>('DB_USER'),
        password: config.get<string>('DB_PASSWORD'),
        // Registra automáticamente las entidades declaradas en cada módulo
        autoLoadEntities: true,
        // Las tablas NUNCA se ajustan solas: cada cambio es una migración versionada
        // en src/database/migrations. Con DB_MIGRATIONS_RUN=true (por defecto) se aplican
        // al arrancar las que falten; con false, solo con "npm run migration:run".
        synchronize: false,
        migrations: [join(import.meta.dirname, 'database', 'migrations', '*.js')],
        migrationsTableName: 'migraciones',
        migrationsRun: config.get('DB_MIGRATIONS_RUN', 'true') !== 'false',
      }),
    }),

    // Panel visual de pruebas del administrador (HTML/CSS/JS en la carpeta /panel)
    // y la librería de mapas Leaflet servida localmente desde node_modules (sin CDN).
    // Van fuera de /api/v1, así no interfieren con la API ni con Swagger.
    ServeStaticModule.forRoot(
      {
        rootPath: join(import.meta.dirname, '..', 'node_modules', 'leaflet', 'dist'),
        serveRoot: '/panel/vendor/leaflet',
      },
      {
        rootPath: join(import.meta.dirname, '..', 'panel'),
        serveRoot: '/panel',
      },
    ),

    // Límite general de peticiones: 100 por minuto por IP
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),

    HealthModule,
    AuthModule,
    UsuariosModule,
    RutasModule,
    EmbarcaderosModule,
    HorariosModule,
    ReportesModule,
    AuditoriaModule,
    AdminModule,
    PublicoModule,
  ],
  // Aplica el límite de peticiones a toda la API
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
