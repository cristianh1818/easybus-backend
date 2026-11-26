import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { carpetaUploads, PREFIJO_UPLOADS } from './common/archivos/uploads.js';
import { AppModule } from './app.module.js';
import { ErroresFilter } from './common/errores/errores.filter.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Detrás de un proxy (Caddy en producción): la IP real del cliente viene en
  // X-Forwarded-For. Sin esto el límite de peticiones (throttler) vería a todos los
  // usuarios como una sola IP, la del proxy. TRUST_PROXY=1 = confiar en un salto.
  const trustProxy = process.env.TRUST_PROXY;
  if (trustProxy) {
    app.set(
      'trust proxy',
      /^\d+$/.test(trustProxy) ? Number(trustProxy) : trustProxy,
    );
  }

  // Todas las rutas de la API empiezan por /api/v1 (versionado)
  app.setGlobalPrefix('api/v1');

  // Fotos subidas por el administrador: /uploads/<uuid>.webp (fuera de /api/v1).
  // Los nombres son aleatorios y nunca se reutilizan, así que se pueden guardar en caché.
  app.useStaticAssets(carpetaUploads(), {
    prefix: `${PREFIJO_UPLOADS}/`,
    index: false,
    dotfiles: 'deny',
    maxAge: '365d',
    immutable: true,
    setHeaders: (res) => res.setHeader('X-Content-Type-Options', 'nosniff'),
  });

  // CORS: en producción solo se acepta el dominio del panel (variable CORS_ORIGINS)
  const origenes = process.env.CORS_ORIGINS?.split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  app.enableCors({ origin: origenes?.length ? origenes : true });

  // Valida automáticamente los datos de entrada según los DTOs:
  // whitelist elimina campos desconocidos, forbidNonWhitelisted los rechaza con error 400
  // y transform convierte los tipos (ej. "5" -> 5)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Todas las respuestas de error con el mismo formato: { statusCode, code, message }
  // (incluye validaciones, autenticación, límite de peticiones y errores de PostgreSQL)
  app.useGlobalFilters(new ErroresFilter());

  // Documentación interactiva en /api/docs (solo desarrollo y pruebas, sección 9.1)
  const swagger = process.env.SWAGGER_ENABLED !== 'false';
  if (swagger) {
    const config = new DocumentBuilder()
      .setTitle('EASYBUS API')
      .setDescription(
        'API REST de EASYBUS para el transporte público fluvial **Businú** (río Sinú, Montería).\n\n' +
          '**Cómo probar las funciones de administrador:**\n' +
          '1. Abrir `POST /api/v1/auth/login` → *Try it out* → *Execute* (ya trae el usuario de ejemplo).\n' +
          '2. Copiar el `accessToken` de la respuesta.\n' +
          '3. Clic en **Authorize** (arriba a la derecha), pegar el token y aceptar.\n\n' +
          '⚠️ Los datos de ejemplo **no son oficiales** (`esOficial: false`). ' +
          'Las horas de salida son programadas, no la ubicación real de la embarcación.',
      )
      .setVersion('0.1.0-beta')
      .addBearerAuth({
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Pega aquí el accessToken obtenido en POST /auth/login',
      })
      // Orden de las secciones en la página
      .addTag('Autenticación')
      .addTag('Público · Rutas')
      .addTag('Público · Embarcaderos')
      .addTag('Público · Avisos')
      .addTag('Público · Reportes')
      .addTag('Cuenta · Favoritos')
      .addTag('Admin · Resumen')
      .addTag('Admin · Embarcaderos')
      .addTag('Admin · Rutas')
      .addTag('Admin · Horarios')
      .addTag('Admin · Festivos')
      .addTag('Admin · Avisos')
      .addTag('Admin · Embarcaciones')
      .addTag('Admin · Reportes')
      .addTag('Admin · Auditoría')
      .addTag('Admin · Usuarios')
      .addTag('Salud')
      .build();

    const documento = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, documento, {
      customSiteTitle: 'EASYBUS API · Documentación',
      swaggerOptions: {
        persistAuthorization: true, // mantiene el token al recargar la página
        docExpansion: 'none',
        displayRequestDuration: true,
      },
    });
  }

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`EASYBUS API escuchando en http://localhost:${port}/api/v1`);
  if (swagger)
    console.log(`Documentación Swagger en http://localhost:${port}/api/docs`);
}
await bootstrap();
