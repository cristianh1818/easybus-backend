import { randomUUID } from 'node:crypto';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { DataSource } from 'typeorm';
import { AppModule } from './../src/app.module.js';
import { ErroresFilter } from './../src/common/errores/errores.filter.js';

// ESCRIBE datos (un usuario de prueba y sus favoritos): solo corre contra la base
// aparte "easybus_prueba", nunca contra la real. Uso:
//   DB_NAME=easybus_prueba npx vitest run --config ./vitest.config.e2e.ts test/favoritos.e2e-spec.ts
const enBaseDePrueba = process.env.DB_NAME === 'easybus_prueba';

describe.runIf(enBaseDePrueba)('/api/v1/usuarios/me/favoritos (e2e)', () => {
  let app: INestApplication<App>;
  let token: string;
  let usuarioId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
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

    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        nombre: 'Prueba Favoritos',
        correo: `favoritos-${randomUUID()}@prueba.easybus.co`,
        password: 'ClaveSegura123',
      })
      .expect(201);
    token = res.body.accessToken as string;
    usuarioId = res.body.usuario.id as string;
  });

  afterAll(async () => {
    // Borra el usuario de prueba (sus favoritos se borran en cascada)
    if (usuarioId) {
      await app
        .get(DataSource)
        .query('DELETE FROM usuarios WHERE id = $1', [usuarioId]);
    }
    await app.close();
  });

  it('sin sesión responde 401', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/usuarios/me/favoritos')
      .expect(401);
  });

  it('guarda, lista y quita un embarcadero favorito; valida el tipo', async () => {
    const server = app.getHttpServer();
    const auth = { Authorization: `Bearer ${token}` };
    const lista = await request(server).get('/api/v1/embarcaderos').expect(200);
    const embarcaderoId = (lista.body as { id: string }[])[0].id;

    await request(server)
      .post('/api/v1/usuarios/me/favoritos')
      .set(auth)
      .send({ tipo: 'embarcadero', id: embarcaderoId })
      .expect(201);
    // Guardar dos veces no es un error
    await request(server)
      .post('/api/v1/usuarios/me/favoritos')
      .set(auth)
      .send({ tipo: 'embarcadero', id: embarcaderoId })
      .expect(201);

    const res = await request(server)
      .get('/api/v1/usuarios/me/favoritos')
      .set(auth)
      .expect(200);
    expect(res.body.rutas).toEqual([]);
    expect(res.body.embarcaderos).toHaveLength(1);
    expect(res.body.embarcaderos[0]).toMatchObject({ id: embarcaderoId });

    await request(server)
      .delete(`/api/v1/usuarios/me/favoritos/embarcadero/${embarcaderoId}`)
      .set(auth)
      .expect(204);
    const vacio = await request(server)
      .get('/api/v1/usuarios/me/favoritos')
      .set(auth)
      .expect(200);
    expect(vacio.body.embarcaderos).toEqual([]);

    const malo = await request(server)
      .post('/api/v1/usuarios/me/favoritos')
      .set(auth)
      .send({ tipo: 'bus', id: embarcaderoId })
      .expect(400);
    expect(malo.body).toMatchObject({
      statusCode: 400,
      code: 'DATOS_INVALIDOS',
    });
  });
});
