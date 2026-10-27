import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RutasService } from '../rutas/rutas.service.js';
import { HorariosService } from '../horarios/horarios.service.js';
import { ProximaSalidaService } from './proxima-salida.service.js';
import {
  ConsultaHorariosDto,
  ConsultaProximaSalidaDto,
} from './dto/consultas.dto.js';
import { EstadoRuta } from '../common/enums.js';
import { interpretarMomento } from './proxima-salida.util.js';

// Consultas del pasajero: no requieren iniciar sesión (nota de la Tabla 2)
@ApiTags('Público · Rutas')
@Controller('rutas')
export class PublicoController {
  constructor(
    private readonly rutas: RutasService,
    private readonly horarios: HorariosService,
    private readonly proximaSalida: ProximaSalidaService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Listar las rutas activas con código, nombre y estado (RF-01)' })
  listar() {
    return this.rutas.listar({ estado: EstadoRuta.ACTIVA });
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Detalle de la ruta: sentidos, trazado GeoJSON y embarcaderos en orden (RF-02, RF-03, RF-04)',
  })
  detalle(@Param('id', ParseUUIDPipe) id: string) {
    return this.rutas.obtenerDetalle(id);
  }

  @Get(':id/horarios')
  @ApiOperation({ summary: 'Horarios de un sentido por tipo de día (RF-05)' })
  horariosDe(@Param('id', ParseUUIDPipe) id: string, @Query() q: ConsultaHorariosDto) {
    return this.horarios.listar(id, q.sentido, q.tipoDia);
  }

  @Get(':id/proxima-salida')
  @ApiOperation({
    summary: 'Próxima salida calculada con la hora de Montería (America/Bogota) (RF-06)',
    description:
      'status: NEXT_DEPARTURE (próxima salida), NO_MORE_DEPARTURES_TODAY (no hay más hoy) ' +
      'u OUT_OF_SERVICE (ruta fuera de servicio). Es una estimación según el horario programado.',
  })
  proxima(@Param('id', ParseUUIDPipe) id: string, @Query() q: ConsultaProximaSalidaDto) {
    const instante = q.momento ? interpretarMomento(q.momento) : new Date();
    return this.proximaSalida.calcular(id, q.sentido, instante);
  }
}
