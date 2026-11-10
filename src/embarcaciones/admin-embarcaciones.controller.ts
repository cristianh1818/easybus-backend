import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { EmbarcacionesService } from './embarcaciones.service.js';
import {
  ActualizarEmbarcacionDto,
  CrearEmbarcacionDto,
  FiltroEmbarcacionesDto,
} from './dto/embarcacion.dto.js';
import { Auth } from '../auth/decorators/auth.decorator.js';
import { UsuarioActual } from '../auth/decorators/usuario-actual.decorator.js';
import type { UsuarioActual as UsuarioActualData } from '../auth/interfaces/usuario-token.interface.js';
import { Rol } from '../common/enums.js';

@ApiTags('Admin · Embarcaciones')
@Auth(Rol.ADMINISTRADOR)
@Controller('admin/embarcaciones')
export class AdminEmbarcacionesController {
  constructor(private readonly embarcaciones: EmbarcacionesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar embarcaciones (filtro por estado: operativa / mantenimiento)' })
  listar(@Query() filtro: FiltroEmbarcacionesDto) {
    return this.embarcaciones.listar(filtro);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Ver una embarcación' })
  obtener(@Param('id', ParseUUIDPipe) id: string) {
    return this.embarcaciones.obtener(id);
  }

  @Post()
  @ApiOperation({ summary: 'Registrar una embarcación (código único, nombre, capacidad)' })
  crear(@Body() dto: CrearEmbarcacionDto, @UsuarioActual() u: UsuarioActualData) {
    return this.embarcaciones.crear(dto, u.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Editar una embarcación (por ejemplo, pasarla a mantenimiento)' })
  actualizar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ActualizarEmbarcacionDto,
    @UsuarioActual() u: UsuarioActualData,
  ) {
    return this.embarcaciones.actualizar(id, dto, u.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar una embarcación' })
  eliminar(@Param('id', ParseUUIDPipe) id: string, @UsuarioActual() u: UsuarioActualData) {
    return this.embarcaciones.eliminar(id, u.id);
  }
}
