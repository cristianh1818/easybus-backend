import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { FestivosController } from './festivos.controller.js';
import { FiltroFestivosDto } from './dto/festivo.dto.js';
import type { FestivosService } from './festivos.service.js';

describe('FestivosController (público)', () => {
  const guardados = [
    // Simula una columna interna que nunca debe salir en la respuesta pública
    { fecha: '2026-01-01', nombre: 'Año Nuevo', creadoPor: 'admin-id' },
    {
      fecha: '2026-01-12',
      nombre: 'Día de los Reyes Magos',
      creadoPor: 'admin-id',
    },
  ];
  let anioRecibido: number | undefined;
  const servicio = {
    listar: (anio?: number) => {
      anioRecibido = anio;
      return Promise.resolve(guardados);
    },
  } as unknown as FestivosService;
  const controller = new FestivosController(servicio);

  it('responde solo fecha y nombre, en el orden del servicio', async () => {
    const res = await controller.listar({ anio: 2026 });
    expect(res).toEqual([
      { fecha: '2026-01-01', nombre: 'Año Nuevo' },
      { fecha: '2026-01-12', nombre: 'Día de los Reyes Magos' },
    ]);
    expect(anioRecibido).toBe(2026);
  });

  it('sin año lista todos', async () => {
    await controller.listar({});
    expect(anioRecibido).toBeUndefined();
  });
});

describe('FiltroFestivosDto', () => {
  const errores = async (query: Record<string, string>) =>
    validate(plainToInstance(FiltroFestivosDto, query), {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

  it('acepta ?anio=2026 y lo convierte a número', async () => {
    expect(await errores({ anio: '2026' })).toHaveLength(0);
    expect(plainToInstance(FiltroFestivosDto, { anio: '2026' }).anio).toBe(
      2026,
    );
  });

  it('rechaza años fuera de rango o que no son números', async () => {
    expect(await errores({ anio: '1800' })).not.toHaveLength(0);
    expect(await errores({ anio: 'abc' })).not.toHaveLength(0);
  });

  it('rechaza parámetros desconocidos', async () => {
    expect(await errores({ anio: '2026', otro: 'x' })).not.toHaveLength(0);
  });
});
