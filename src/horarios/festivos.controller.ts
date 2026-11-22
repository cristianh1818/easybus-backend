import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FestivosService } from './festivos.service.js';
import { FestivoPublicoDto, FiltroFestivosDto } from './dto/festivo.dto.js';
import { formatearFestivoPublico } from './festivo.mapper.js';

// Festivos para la app del pasajero (sin iniciar sesión): con ellos la app calcula
// la próxima salida sin conexión, con la misma regla que GET /rutas/{id}/proxima-salida.
@ApiTags('Público · Festivos')
@Controller('festivos')
export class FestivosController {
  constructor(private readonly festivos: FestivosService) {}

  @Get()
  @ApiOperation({
    summary: 'Festivos de Colombia registrados (opcional: por año)',
    description:
      'Ese día se aplica el horario de domingo/festivo. Solo fecha (AAAA-MM-DD) y nombre, ordenados por fecha.',
  })
  @ApiOkResponse({ type: FestivoPublicoDto, isArray: true })
  async listar(@Query() filtro: FiltroFestivosDto) {
    const festivos = await this.festivos.listar(filtro.anio);
    return festivos.map(formatearFestivoPublico);
  }
}
