import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UsuariosService } from './usuarios.service.js';
import { Auth } from '../auth/decorators/auth.decorator.js';
import { Rol } from '../common/enums.js';

@ApiTags('Admin · Usuarios')
@Controller('admin/usuarios')
@Auth(Rol.ADMINISTRADOR)
export class UsuariosController {
  constructor(private readonly usuarios: UsuariosService) {}

  // GET /api/v1/admin/usuarios -> solo administradores
  @Get()
  @ApiOperation({ summary: 'Listar usuarios registrados' })
  listar() {
    return this.usuarios.listar();
  }
}
