import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuditoriaService } from './auditoria.service.js';
import { FiltroAuditoriaDto } from './dto/filtro-auditoria.dto.js';
import { Auth } from '../auth/decorators/auth.decorator.js';
import { Rol } from '../common/enums.js';

@ApiTags('Admin · Auditoría')
@Auth(Rol.ADMINISTRADOR)
@Controller('admin/auditoria')
export class AdminAuditoriaController {
  constructor(private readonly auditoria: AuditoriaService) {}

  @Get()
  @ApiOperation({ summary: 'Registro de cambios administrativos (RF-21), del más reciente al más antiguo' })
  listar(@Query() filtro: FiltroAuditoriaDto) {
    return this.auditoria.listar(filtro);
  }
}
