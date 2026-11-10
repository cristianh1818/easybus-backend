import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { EmbarcaderosPublicoService } from './embarcaderos-publico.service.js';
import { CercanosDto, FiltroPublicoEmbarcaderosDto } from './dto/consultas-publicas.dto.js';

// Consultas del pasajero sobre embarcaderos: no requieren iniciar sesión
@ApiTags('Público · Embarcaderos')
@Controller('embarcaderos')
export class EmbarcaderosController {
  constructor(private readonly embarcaderos: EmbarcaderosPublicoService) {}

  @Get()
  @ApiOperation({ summary: 'Listar embarcaderos en servicio (activos y cerrados temporalmente)' })
  listar(@Query() filtro: FiltroPublicoEmbarcaderosDto) {
    return this.embarcaderos.listar(filtro);
  }

  // Va antes de ':id' para que "cercanos" no se interprete como un id
  @Get('cercanos')
  @ApiOperation({
    summary: 'Embarcaderos cercanos a un punto, del más cercano al más lejano (RF-09)',
    description:
      'Pensado para un punto buscado por el usuario (origen o destino escrito). Según RNF-07, en la beta ' +
      'la ubicación GPS del usuario no se envía al servidor: la app calcula esa cercanía en el dispositivo ' +
      'con la lista de GET /embarcaderos.',
  })
  cercanos(@Query() q: CercanosDto) {
    return this.embarcaderos.cercanos(q);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle del embarcadero y rutas activas que pasan por él (orden y minutos desde el origen)' })
  detalle(@Param('id', ParseUUIDPipe) id: string) {
    return this.embarcaderos.detalle(id);
  }
}
