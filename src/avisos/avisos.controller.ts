import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AvisosService } from './avisos.service.js';
import { FiltroAvisosPublicoDto } from './dto/aviso.dto.js';

// La app consulta los avisos cada vez que se abre y los muestra antes que cualquier horario
@ApiTags('Público · Avisos')
@Controller('avisos')
export class AvisosController {
  constructor(private readonly avisos: AvisosService) {}

  @Get()
  @ApiOperation({
    summary: 'Avisos de servicio vigentes ahora (suspendidos primero)',
    description:
      'Sin filtros: todos los vigentes. Con rutaId o embarcaderoId: solo los que los afectan, ' +
      'incluidos los avisos generales del servicio.',
  })
  vigentes(@Query() filtro: FiltroAvisosPublicoDto) {
    return this.avisos.vigentes(filtro);
  }
}
