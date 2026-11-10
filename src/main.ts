import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { DbExceptionFilter } from './common/filters/db-exception.filter.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Todas las rutas de la API empiezan por /api/v1 (versionado)
  app.setGlobalPrefix('api/v1');

  // CORS: en producción solo se acepta el dominio del panel (variable CORS_ORIGINS)
  const origenes = process.env.CORS_ORIGINS?.split(',').map((o) => o.trim()).filter(Boolean);
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

  // Convierte errores de PostgreSQL (duplicados, relaciones) en respuestas 400/409 claras
  app.useGlobalFilters(new DbExceptionFilter());

  // Documentación interactiva en /api/docs (solo desarrollo y pruebas, sección 9.1)
  if (process.env.SWAGGER_ENABLED !== 'false') {
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
      .addTag('Admin · Resumen')
      .addTag('Admin · Embarcaderos')
      .addTag('Admin · Rutas')
      .addTag('Admin · Horarios')
      .addTag('Admin · Festivos')
      .addTag('Admin · Avisos')
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
  console.log(`Documentación Swagger en http://localhost:${port}/api/docs`);
}
await bootstrap();
