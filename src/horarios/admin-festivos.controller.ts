import { BadRequestException, Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { FestivosService } from './festivos.service.js';
import { CrearFestivoDto, FiltroFestivosDto } from './dto/festivo.dto.js';
import { Auth } from '../auth/decorators/auth.decorator.js';
import { UsuarioActual } from '../auth/decorators/usuario-actual.decorator.js';
import type { UsuarioActual as UsuarioActualData } from '../auth/interfaces/usuario-token.interface.js';
import { Rol } from '../common/enums.js';

@ApiTags('Admin · Festivos')
@Auth(Rol.ADMINISTRADOR)
@Controller('admin/festivos')
export class AdminFestivosController {
  constructor(private readonly festivos: FestivosService) {}

  @Get()
  @ApiOperation({ summary: 'Listar festivos (opcional: por año)' })
  listar(@Query() filtro: FiltroFestivosDto) {
    return this.festivos.listar(filtro.anio);
  }

  @Post()
  @ApiOperation({ summary: 'Registrar un festivo: ese día aplica el horario de domingo/festivo' })
  crear(@Body() dto: CrearFestivoDto, @UsuarioActual() u: UsuarioActualData) {
    return this.festivos.crear(dto, u.id);
  }

  @Delete(':fecha')
  @ApiParam({ name: 'fecha', example: '2026-11-02' })
  @ApiOperation({ summary: 'Eliminar un festivo' })
  eliminar(@Param('fecha') fecha: string, @UsuarioActual() u: UsuarioActualData) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      throw new BadRequestException('fecha debe tener el formato AAAA-MM-DD');
    }
    return this.festivos.eliminar(fecha, u.id);
  }
}
