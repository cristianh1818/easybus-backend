import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { ErroresFilter } from './../src/common/errores/errores.filter.js';

// Solo lecturas (GET): no modifica datos ni deja registros de auditoría.
// Requiere la base de datos levantada.
describe('GET /api/v1/festivos (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    // Igual que main.ts
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new ErroresFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('es público y devuelve solo fecha y nombre del año pedido, ordenados', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/festivos?anio=2026')
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    const fechas = (res.body as { fecha: string }[]).map((f) => f.fecha);
    expect([...fechas].sort()).toEqual(fechas);
    for (const f of res.body as Record<string, unknown>[]) {
      expect(Object.keys(f).sort()).toEqual(['fecha', 'nombre']);
      expect(f.fecha).toMatch(/^2026-\d{2}-\d{2}$/);
    }
  });

  it('un año inválido responde 400 con el formato de error uniforme', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/festivos?anio=1800')
      .expect(400);
    expect(res.body).toMatchObject({
      statusCode: 400,
      code: 'DATOS_INVALIDOS',
    });
    expect(typeof res.body.message).toBe('string');
  });
});
