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
import { HorariosService } from './horarios.service.js';
import {
  ActualizarHorarioDto,
  CrearHorarioDto,
  FiltroHorariosDto,
  ReemplazarHorariosDto,
} from './dto/horario.dto.js';
import { Auth } from '../auth/decorators/auth.decorator.js';
import { UsuarioActual } from '../auth/decorators/usuario-actual.decorator.js';
import type { UsuarioActual as UsuarioActualData } from '../auth/interfaces/usuario-token.interface.js';
import { Rol, Sentido, TipoDia } from '../common/enums.js';

@ApiTags('Admin · Horarios')
@Auth(Rol.ADMINISTRADOR)
@Controller('admin')
export class AdminHorariosController {
  constructor(private readonly horarios: HorariosService) {}

  @Get('rutas/:id/sentidos/:sentido/horarios')
  @ApiParam({ name: 'sentido', enum: Sentido })
  @ApiOperation({ summary: 'Ver los horarios de un sentido (opcional: filtrar por tipo de día)' })
  listar(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('sentido', new ParseEnumPipe(Sentido)) sentido: Sentido,
    @Query() filtro: FiltroHorariosDto,
  ) {
    return this.horarios.listar(id, sentido, filtro.tipoDia);
  }

  @Put('rutas/:id/sentidos/:sentido/horarios/:tipoDia')
  @ApiParam({ name: 'sentido', enum: Sentido })
  @ApiParam({ name: 'tipoDia', enum: TipoDia })
  @ApiOperation({ summary: 'Cargar todas las horas de un sentido y tipo de día (reemplaza las anteriores) (RF-18)' })
  reemplazar(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('sentido', new ParseEnumPipe(Sentido)) sentido: Sentido,
    @Param('tipoDia', new ParseEnumPipe(TipoDia)) tipoDia: TipoDia,
    @Body() dto: ReemplazarHorariosDto,
    @UsuarioActual() u: UsuarioActualData,
  ) {
    return this.horarios.reemplazar(id, sentido, tipoDia, dto.horas, u.id);
  }

  @Post('rutas/:id/sentidos/:sentido/horarios')
  @ApiParam({ name: 'sentido', enum: Sentido })
  @ApiOperation({ summary: 'Agregar una hora de salida' })
  crear(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('sentido', new ParseEnumPipe(Sentido)) sentido: Sentido,
    @Body() dto: CrearHorarioDto,
    @UsuarioActual() u: UsuarioActualData,
  ) {
    return this.horarios.crear(id, sentido, dto, u.id);
  }

  @Patch('horarios/:horarioId')
  @ApiOperation({ summary: 'Editar una hora de salida' })
  actualizar(
    @Param('horarioId', ParseUUIDPipe) horarioId: string,
    @Body() dto: ActualizarHorarioDto,
    @UsuarioActual() u: UsuarioActualData,
  ) {
    return this.horarios.actualizar(horarioId, dto, u.id);
  }

  @Delete('horarios/:horarioId')
  @ApiOperation({ summary: 'Eliminar una hora de salida' })
  eliminar(
    @Param('horarioId', ParseUUIDPipe) horarioId: string,
    @UsuarioActual() u: UsuarioActualData,
  ) {
    return this.horarios.eliminar(horarioId, u.id);
  }
}
