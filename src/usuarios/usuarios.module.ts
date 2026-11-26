import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Usuario } from './entities/usuario.entity.js';
import { Favorito } from './entities/favorito.entity.js';
import { FavoritoEmbarcadero } from './entities/favorito-embarcadero.entity.js';
import { Ruta } from '../rutas/entities/ruta.entity.js';
import { Embarcadero } from '../embarcaderos/entities/embarcadero.entity.js';
import { FavoritosService } from './favoritos.service.js';
import { FavoritosController } from './favoritos.controller.js';
import { UsuariosService } from './usuarios.service.js';
import { UsuariosController } from './usuarios.controller.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Usuario,
      Favorito,
      FavoritoEmbarcadero,
      Ruta,
      Embarcadero,
    ]),
  ],
  controllers: [UsuariosController, FavoritosController],
  providers: [UsuariosService, FavoritosService],
  exports: [TypeOrmModule, UsuariosService],
})
export class UsuariosModule {}
