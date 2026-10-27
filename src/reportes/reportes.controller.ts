import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ReportesService } from './reportes.service.js';
import { CrearReporteDto } from './dto/reporte.dto.js';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard.js';
import { UsuarioActual } from '../auth/decorators/usuario-actual.decorator.js';
import type { UsuarioActual as UsuarioActualData } from '../auth/interfaces/usuario-token.interface.js';

@ApiTags('Público · Reportes')
@Controller('reportes')
export class ReportesController {
  constructor(private readonly reportes: ReportesService) {}

  @Post()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Reportar un error en una ruta, embarcadero u horario (no requiere cuenta)' })
  crear(@Body() dto: CrearReporteDto, @UsuarioActual() u?: UsuarioActualData | null) {
    return this.reportes.crear(dto, u?.id ?? null);
  }
}
