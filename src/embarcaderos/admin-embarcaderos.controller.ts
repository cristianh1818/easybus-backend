import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { EmbarcaderosService } from './embarcaderos.service.js';
import { CrearEmbarcaderoDto } from './dto/crear-embarcadero.dto.js';
import { ActualizarEmbarcaderoDto } from './dto/actualizar-embarcadero.dto.js';
import { FiltroEmbarcaderosDto } from './dto/filtro-embarcaderos.dto.js';
import { Auth } from '../auth/decorators/auth.decorator.js';
import { UsuarioActual } from '../auth/decorators/usuario-actual.decorator.js';
import type { UsuarioActual as UsuarioActualData } from '../auth/interfaces/usuario-token.interface.js';
import { Rol } from '../common/enums.js';

@ApiTags('Admin · Embarcaderos')
@Auth(Rol.ADMINISTRADOR)
@Controller('admin/embarcaderos')
export class AdminEmbarcaderosController {
  constructor(private readonly embarcaderos: EmbarcaderosService) {}

  @Get()
  @ApiOperation({ summary: 'Listar embarcaderos (activos e inactivos)' })
  listar(@Query() filtro: FiltroEmbarcaderosDto) {
    return this.embarcaderos.listar(filtro);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Ver un embarcadero' })
  obtener(@Param('id', ParseUUIDPipe) id: string) {
    return this.embarcaderos.obtener(id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear embarcadero con sus coordenadas (RF-16)' })
  crear(@Body() dto: CrearEmbarcaderoDto, @UsuarioActual() u: UsuarioActualData) {
    return this.embarcaderos.crear(dto, u.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Editar embarcadero (solo los campos enviados)' })
  actualizar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ActualizarEmbarcaderoDto,
    @UsuarioActual() u: UsuarioActualData,
  ) {
    return this.embarcaderos.actualizar(id, dto, u.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar embarcadero (no permitido si está asignado a una ruta)' })
  eliminar(@Param('id', ParseUUIDPipe) id: string, @UsuarioActual() u: UsuarioActualData) {
    return this.embarcaderos.eliminar(id, u.id);
  }
}
