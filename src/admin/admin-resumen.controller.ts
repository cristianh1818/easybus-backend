import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { DataSource } from 'typeorm';
import { Auth } from '../auth/decorators/auth.decorator.js';
import { Rol } from '../common/enums.js';

@ApiTags('Admin · Resumen')
@Auth(Rol.ADMINISTRADOR)
@Controller('admin/resumen')
export class AdminResumenController {
  constructor(private readonly dataSource: DataSource) {}

  @Get()
  @ApiOperation({ summary: 'Cifras generales para la pantalla de inicio del panel' })
  async resumen() {
    const [cifras] = await this.dataSource.query<Record<string, number>[]>(`
      SELECT
        (SELECT count(*) FROM rutas)::int                                AS "rutas",
        (SELECT count(*) FROM rutas WHERE estado = 'activa')::int        AS "rutasActivas",
        (SELECT count(*) FROM embarcaderos)::int                         AS "embarcaderos",
        (SELECT count(*) FROM embarcaderos WHERE estado = 'activo')::int AS "embarcaderosActivos",
        (SELECT count(*) FROM horarios)::int                             AS "horarios",
        (SELECT count(*) FROM dias_festivos WHERE fecha >= current_date)::int AS "festivosProximos",
        (SELECT count(*) FROM reportes WHERE estado = 'pendiente')::int  AS "reportesPendientes",
        (SELECT count(*) FROM avisos_servicio
           WHERE vigente_desde <= now() AND (vigente_hasta IS NULL OR vigente_hasta > now()))::int AS "avisosVigentes",
        (SELECT count(*) FROM avisos_servicio WHERE tipo = 'suspendido'
           AND vigente_desde <= now() AND (vigente_hasta IS NULL OR vigente_hasta > now()))::int AS "suspensionesVigentes",
        (SELECT count(*) FROM auditoria
           WHERE creado_en >= now() - interval '7 days')::int            AS "cambiosUltimos7Dias"
    `);
    return cifras;
  }
}
