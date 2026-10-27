// Carga los datos de ejemplo en la base de datos.
//   npm run seed          -> (re)crea las rutas, embarcaderos, horarios y festivos de ejemplo
//   npm run seed:reset    -> además borra reportes, auditoría y TODAS las rutas/embarcaderos
//                            no oficiales (para empezar la demo limpia)
// Se puede ejecutar varias veces: primero borra los datos de ejemplo anteriores.

import { NestFactory } from '@nestjs/core';
import { DataSource, In } from 'typeorm';
import { AppModule } from '../app.module.js';
import { Embarcadero } from '../embarcaderos/entities/embarcadero.entity.js';
import { Ruta } from '../rutas/entities/ruta.entity.js';
import { RutaSentido } from '../rutas/entities/ruta-sentido.entity.js';
import { RutaEmbarcadero } from '../rutas/entities/ruta-embarcadero.entity.js';
import { Horario } from '../horarios/entities/horario.entity.js';
import { DiaFestivo } from '../horarios/entities/dia-festivo.entity.js';
import { Reporte } from '../reportes/entities/reporte.entity.js';
import { Auditoria } from '../auditoria/entities/auditoria.entity.js';
import { EstadoRuta, TipoDia, TipoReporte } from '../common/enums.js';
import { EMBARCADEROS, FESTIVOS_2026, RUTAS } from './datos-ejemplo.js';

async function seed() {
  const logger = { log: (msg: string) => console.log(`[Seed] ${msg}`) };
  const reiniciar = process.argv.includes('--reset');

  // Arranca la aplicación sin servidor HTTP, solo para usar la conexión a la BD
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  const dataSource = app.get(DataSource);

  await dataSource.transaction(async (m) => {
    if (reiniciar) {
      await m.createQueryBuilder().delete().from(Reporte).execute();
      await m.createQueryBuilder().delete().from(Auditoria).execute();
      logger.log('Reportes y auditoría borrados');
    }

    // 1. Borrar los datos de ejemplo anteriores (rutas en cascada, luego embarcaderos).
    //    Con --reset se borra TODO lo no oficial (incluye lo creado durante una demo).
    if (reiniciar) {
      await m.delete(Ruta, { esOficial: false });
      await m.delete(Embarcadero, { esOficial: false });
      logger.log('Rutas y embarcaderos no oficiales borrados');
    } else {
      await m.delete(Ruta, { codigo: In(RUTAS.map((r) => r.codigo)) });
      await m.delete(Embarcadero, {
        nombre: In(EMBARCADEROS.map((e) => e.nombre)),
        esOficial: false,
      });
    }

    // 2. Embarcaderos
    const ids = new Map<string, string>();
    for (const e of EMBARCADEROS) {
      const guardado = await m.save(
        m.create(Embarcadero, {
          nombre: e.nombre,
          referencia: e.referencia,
          ubicacion: { type: 'Point', coordinates: [e.longitud, e.latitud] },
          activo: true,
          esOficial: false,
        }),
      );
      ids.set(e.clave, guardado.id);
    }
    logger.log(`${EMBARCADEROS.length} embarcaderos creados`);

    // 3. Rutas con sus sentidos, trazado, secuencia y horarios
    let totalHorarios = 0;
    for (const r of RUTAS) {
      const ruta = await m.save(
        m.create(Ruta, {
          codigo: r.codigo,
          nombre: r.nombre,
          descripcion: r.descripcion,
          color: r.color,
          estado: EstadoRuta.ACTIVA,
          esOficial: false,
        }),
      );

      for (const s of r.sentidos) {
        const sentido = await m.save(
          m.create(RutaSentido, {
            rutaId: ruta.id,
            sentido: s.sentido,
            destino: s.destino,
            trazado: { type: 'LineString', coordinates: s.trazado },
          }),
        );

        await m.insert(
          RutaEmbarcadero,
          s.embarcaderos.map((clave, i) => ({
            rutaSentidoId: sentido.id,
            embarcaderoId: ids.get(clave)!,
            orden: i + 1,
          })),
        );

        for (const tipoDia of Object.values(TipoDia)) {
          const horas = s.horarios[tipoDia];
          await m.insert(
            Horario,
            horas.map((horaSalida) => ({ rutaSentidoId: sentido.id, tipoDia, horaSalida })),
          );
          totalHorarios += horas.length;
        }
      }
      logger.log(`Ruta ${r.codigo} "${r.nombre}" creada`);
    }
    logger.log(`${totalHorarios} horarios creados`);

    // 4. Festivos (si ya existen se dejan como están)
    await m
      .createQueryBuilder()
      .insert()
      .into(DiaFestivo)
      .values(FESTIVOS_2026)
      .orIgnore()
      .execute();
    logger.log(`${FESTIVOS_2026.length} festivos de 2026 registrados`);

    // 5. Un reporte de ejemplo para mostrar la gestión de reportes
    if (reiniciar) {
      const bs1 = await m.findOneByOrFail(Ruta, { codigo: 'BS-1' });
      await m.save(
        m.create(Reporte, {
          tipo: TipoReporte.HORARIO,
          descripcion:
            'Ejemplo: la salida de las 06:00 desde el Embarcadero Ronda Norte pasó 10 minutos tarde.',
          rutaId: bs1.id,
          embarcaderoId: ids.get('NORTE')!,
        }),
      );
      logger.log('1 reporte de ejemplo creado');
    }
  });

  await app.close();
  logger.log('Datos de ejemplo cargados. Recuerda: NO son datos oficiales.');
}

seed().catch((error: unknown) => {
  console.error('Error cargando los datos de ejemplo:', error);
  process.exit(1);
});
