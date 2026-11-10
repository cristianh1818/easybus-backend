import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseEnumPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { RutasService } from './rutas.service.js';
import { CrearRutaDto } from './dto/crear-ruta.dto.js';
import { ActualizarRutaDto } from './dto/actualizar-ruta.dto.js';
import { FiltroRutasDto } from './dto/filtro-rutas.dto.js';
import { GuardarSentidoDto } from './dto/guardar-sentido.dto.js';
import { TrazadoDto } from './dto/trazado.dto.js';
import { AsignarEmbarcaderosDto } from './dto/asignar-embarcaderos.dto.js';
import { ActualizarTiempoDto } from './dto/actualizar-tiempo.dto.js';
import { Auth } from '../auth/decorators/auth.decorator.js';
import { UsuarioActual } from '../auth/decorators/usuario-actual.decorator.js';
import type { UsuarioActual as UsuarioActualData } from '../auth/interfaces/usuario-token.interface.js';
import { Rol, Sentido } from '../common/enums.js';

const sentidoPipe = new ParseEnumPipe(Sentido);

@ApiTags('Admin · Rutas')
@Auth(Rol.ADMINISTRADOR)
@Controller('admin/rutas')
export class AdminRutasController {
  constructor(private readonly rutas: RutasService) {}

  @Get()
  @ApiOperation({ summary: 'Listar todas las rutas (activas e inactivas)' })
  listar(@Query() filtro: FiltroRutasDto) {
    return this.rutas.listar(filtro);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de la ruta con sentidos, trazados y embarcaderos en orden' })
  obtener(@Param('id', ParseUUIDPipe) id: string) {
    return this.rutas.obtenerDetalle(id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear ruta (RF-15)' })
  crear(@Body() dto: CrearRutaDto, @UsuarioActual() u: UsuarioActualData) {
    return this.rutas.crear(dto, u.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Editar ruta. Para activar/desactivar: { "estado": "activa" | "inactiva" }' })
  actualizar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ActualizarRutaDto,
    @UsuarioActual() u: UsuarioActualData,
  ) {
    return this.rutas.actualizar(id, dto, u.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar ruta (borra también sus sentidos, secuencias y horarios)' })
  eliminar(@Param('id', ParseUUIDPipe) id: string, @UsuarioActual() u: UsuarioActualData) {
    return this.rutas.eliminar(id, u.id);
  }

  @Put(':id/sentidos/:sentido')
  @ApiParam({ name: 'sentido', enum: Sentido })
  @ApiOperation({ summary: 'Crear o actualizar un sentido (ida/vuelta) con su destino y trazado opcional' })
  guardarSentido(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('sentido', sentidoPipe) sentido: Sentido,
    @Body() dto: GuardarSentidoDto,
    @UsuarioActual() u: UsuarioActualData,
  ) {
    return this.rutas.guardarSentido(id, sentido, dto, u.id);
  }

  @Delete(':id/sentidos/:sentido')
  @ApiParam({ name: 'sentido', enum: Sentido })
  @ApiOperation({ summary: 'Eliminar un sentido (borra su secuencia y horarios)' })
  eliminarSentido(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('sentido', sentidoPipe) sentido: Sentido,
    @UsuarioActual() u: UsuarioActualData,
  ) {
    return this.rutas.eliminarSentido(id, sentido, u.id);
  }

  @Put(':id/sentidos/:sentido/trazado')
  @ApiParam({ name: 'sentido', enum: Sentido })
  @ApiOperation({ summary: 'Registrar o reemplazar el trazado GeoJSON del sentido (RF-17)' })
  actualizarTrazado(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('sentido', sentidoPipe) sentido: Sentido,
    @Body() dto: TrazadoDto,
    @UsuarioActual() u: UsuarioActualData,
  ) {
    return this.rutas.actualizarTrazado(id, sentido, dto, u.id);
  }

  @Put(':id/sentidos/:sentido/embarcaderos')
  @ApiParam({ name: 'sentido', enum: Sentido })
  @ApiOperation({ summary: 'Asignar los embarcaderos del sentido en orden (RF-16)' })
  asignarEmbarcaderos(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('sentido', sentidoPipe) sentido: Sentido,
    @Body() dto: AsignarEmbarcaderosDto,
    @UsuarioActual() u: UsuarioActualData,
  ) {
    return this.rutas.asignarEmbarcaderos(id, sentido, dto.embarcaderoIds, u.id);
  }

  @Patch(':id/sentidos/:sentido/embarcaderos/:embarcaderoId')
  @ApiParam({ name: 'sentido', enum: Sentido })
  @ApiOperation({ summary: 'Editar los minutos desde el origen de un embarcadero y si son estimados o reales' })
  actualizarTiempo(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('sentido', sentidoPipe) sentido: Sentido,
    @Param('embarcaderoId', ParseUUIDPipe) embarcaderoId: string,
    @Body() dto: ActualizarTiempoDto,
    @UsuarioActual() u: UsuarioActualData,
  ) {
    return this.rutas.actualizarTiempo(id, sentido, embarcaderoId, dto, u.id);
  }

  @Post(':id/sentidos/:sentido/tiempos/recalcular')
  @ApiParam({ name: 'sentido', enum: Sentido })
  @ApiOperation({
    summary: 'Recalcular los tiempos estimados (10 min/km por el trazado; nunca menos que la línea recta)',
  })
  recalcularTiempos(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('sentido', sentidoPipe) sentido: Sentido,
    @UsuarioActual() u: UsuarioActualData,
  ) {
    return this.rutas.recalcularTiempos(id, sentido, u.id);
  }
}
