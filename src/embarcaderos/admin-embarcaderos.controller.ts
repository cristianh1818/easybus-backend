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
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { memoryStorage } from 'multer';
import { TAMANO_MAXIMO_FOTO } from './fotos/procesar-foto.js';
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

  @Post(':id/foto')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @UseInterceptors(
    FileInterceptor('foto', {
      storage: memoryStorage(),
      limits: { fileSize: TAMANO_MAXIMO_FOTO, files: 1, fields: 0 },
    }),
  )
  @ApiOperation({
    summary: 'Subir o reemplazar la foto del embarcadero',
    description:
      'JPG, PNG o WEBP de máximo 5 MB (se valida el contenido real). Se reduce a 1280 px, ' +
      'se convierte a WEBP y se le quitan los metadatos EXIF (incluida la ubicación GPS). ' +
      'La foto anterior se borra. Devuelve el embarcadero con fotoUrl = /uploads/….webp',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['foto'],
      properties: { foto: { type: 'string', format: 'binary' } },
    },
  })
  subirFoto(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() archivo: Express.Multer.File | undefined,
    @UsuarioActual() u: UsuarioActualData,
  ) {
    return this.embarcaderos.subirFoto(id, archivo?.buffer, u.id);
  }

  @Delete(':id/foto')
  @ApiOperation({ summary: 'Quitar la foto del embarcadero (borra el archivo subido)' })
  quitarFoto(@Param('id', ParseUUIDPipe) id: string, @UsuarioActual() u: UsuarioActualData) {
    return this.embarcaderos.quitarFoto(id, u.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar embarcadero (no permitido si está asignado a una ruta)' })
  eliminar(@Param('id', ParseUUIDPipe) id: string, @UsuarioActual() u: UsuarioActualData) {
    return this.embarcaderos.eliminar(id, u.id);
  }
}
