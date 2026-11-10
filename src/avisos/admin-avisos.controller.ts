import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AvisosService } from './avisos.service.js';
import { ActualizarAvisoDto, CrearAvisoDto, FiltroAvisosAdminDto } from './dto/aviso.dto.js';
import { Auth } from '../auth/decorators/auth.decorator.js';
import { UsuarioActual } from '../auth/decorators/usuario-actual.decorator.js';
import type { UsuarioActual as UsuarioActualData } from '../auth/interfaces/usuario-token.interface.js';
import { Rol } from '../common/enums.js';

@ApiTags('Admin · Avisos')
@Auth(Rol.ADMINISTRADOR)
@Controller('admin/avisos')
export class AdminAvisosController {
  constructor(private readonly avisos: AvisosService) {}

  @Get()
  @ApiOperation({ summary: 'Listar avisos (filtro por vigencia: programado, vigente, vencido)' })
  listar(@Query() filtro: FiltroAvisosAdminDto) {
    return this.avisos.listar(filtro);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Ver un aviso' })
  obtener(@Param('id', ParseUUIDPipe) id: string) {
    return this.avisos.obtener(id);
  }

  @Post()
  @ApiOperation({
    summary: 'Publicar un aviso de servicio',
    description: 'Sin ruta ni embarcadero aplica a todo el servicio. Tipos: suspendido, retraso, cambio_horario, informativo.',
  })
  crear(@Body() dto: CrearAvisoDto, @UsuarioActual() u: UsuarioActualData) {
    return this.avisos.crear(dto, u.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Editar un aviso' })
  actualizar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ActualizarAvisoDto,
    @UsuarioActual() u: UsuarioActualData,
  ) {
    return this.avisos.actualizar(id, dto, u.id);
  }

  @Post(':id/cerrar')
  @ApiOperation({ summary: 'Cerrar un aviso vigente ahora mismo (queda en el historial como vencido)' })
  cerrar(@Param('id', ParseUUIDPipe) id: string, @UsuarioActual() u: UsuarioActualData) {
    return this.avisos.cerrar(id, u.id);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Eliminar un aviso programado (que nunca ha estado vigente)',
    description: 'Si el aviso ya estuvo vigente responde 409: se debe cerrar para conservar el historial.',
  })
  eliminar(@Param('id', ParseUUIDPipe) id: string, @UsuarioActual() u: UsuarioActualData) {
    return this.avisos.eliminar(id, u.id);
  }
}
