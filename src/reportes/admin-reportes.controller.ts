import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ReportesService } from './reportes.service.js';
import { FiltroReportesDto, GestionarReporteDto } from './dto/reporte.dto.js';
import { Auth } from '../auth/decorators/auth.decorator.js';
import { UsuarioActual } from '../auth/decorators/usuario-actual.decorator.js';
import type { UsuarioActual as UsuarioActualData } from '../auth/interfaces/usuario-token.interface.js';
import { Rol } from '../common/enums.js';

@ApiTags('Admin · Reportes')
@Auth(Rol.ADMINISTRADOR)
@Controller('admin/reportes')
export class AdminReportesController {
  constructor(private readonly reportes: ReportesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar reportes de usuarios (RF-20)' })
  listar(@Query() filtro: FiltroReportesDto) {
    return this.reportes.listar(filtro);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Ver un reporte' })
  obtener(@Param('id', ParseUUIDPipe) id: string) {
    return this.reportes.obtener(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cambiar el estado de un reporte y dejar una respuesta' })
  gestionar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: GestionarReporteDto,
    @UsuarioActual() u: UsuarioActualData,
  ) {
    return this.reportes.gestionar(id, dto, u.id);
  }
}
