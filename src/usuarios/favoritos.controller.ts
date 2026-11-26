import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Auth } from '../auth/decorators/auth.decorator.js';
import { UsuarioActual } from '../auth/decorators/usuario-actual.decorator.js';
import type { UsuarioActual as UsuarioActualData } from '../auth/interfaces/usuario-token.interface.js';
import { AgregarFavoritoDto, FavoritoParamsDto } from './dto/favorito.dto.js';
import { FavoritosService } from './favoritos.service.js';

// Favoritos del pasajero. Exigen sesión (cualquier rol); consultar rutas y
// embarcaderos nunca la exige.
@ApiTags('Cuenta · Favoritos')
@Controller('usuarios/me/favoritos')
@Auth()
export class FavoritosController {
  constructor(private readonly favoritos: FavoritosService) {}

  // GET /api/v1/usuarios/me/favoritos
  @Get()
  @ApiOperation({ summary: 'Rutas y embarcaderos guardados por el usuario' })
  listar(@UsuarioActual() usuario: UsuarioActualData) {
    return this.favoritos.listar(usuario.id);
  }

  // POST /api/v1/usuarios/me/favoritos { tipo, id }
  @Post()
  @ApiOperation({ summary: 'Guardar una ruta o un embarcadero como favorito' })
  agregar(
    @UsuarioActual() usuario: UsuarioActualData,
    @Body() dto: AgregarFavoritoDto,
  ) {
    return this.favoritos.agregar(usuario.id, dto.tipo, dto.id);
  }

  // DELETE /api/v1/usuarios/me/favoritos/:tipo/:id
  @Delete(':tipo/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Quitar un favorito' })
  quitar(
    @UsuarioActual() usuario: UsuarioActualData,
    @Param() params: FavoritoParamsDto,
  ) {
    return this.favoritos.quitar(usuario.id, params.tipo, params.id);
  }
}
