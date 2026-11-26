import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { Favorito } from './entities/favorito.entity.js';
import { FavoritoEmbarcadero } from './entities/favorito-embarcadero.entity.js';
import { Ruta } from '../rutas/entities/ruta.entity.js';
import { Embarcadero } from '../embarcaderos/entities/embarcadero.entity.js';
import { EstadoEmbarcadero, EstadoRuta } from '../common/enums.js';
import type { TipoFavorito } from './dto/favorito.dto.js';

// Favoritos del pasajero con sesión: rutas (tabla favoritos) y embarcaderos
// (tabla favoritos_embarcaderos). Cada usuario solo ve y cambia los suyos: el id
// del usuario sale siempre del token, nunca de la petición.
@Injectable()
export class FavoritosService {
  constructor(
    @InjectRepository(Favorito) private readonly rutas: Repository<Favorito>,
    @InjectRepository(FavoritoEmbarcadero)
    private readonly embarcaderos: Repository<FavoritoEmbarcadero>,
    @InjectRepository(Ruta) private readonly rutasRepo: Repository<Ruta>,
    @InjectRepository(Embarcadero)
    private readonly embarcaderosRepo: Repository<Embarcadero>,
  ) {}

  // Solo lo que el público puede ver: rutas activas y embarcaderos no inactivos
  async listar(usuarioId: string) {
    const [rutas, embarcaderos] = await Promise.all([
      this.rutas.find({
        where: { usuarioId, ruta: { estado: EstadoRuta.ACTIVA } },
        relations: { ruta: true },
        order: { creadoEn: 'DESC' },
      }),
      this.embarcaderos.find({
        where: {
          usuarioId,
          embarcadero: { estado: Not(EstadoEmbarcadero.INACTIVO) },
        },
        relations: { embarcadero: true },
        order: { creadoEn: 'DESC' },
      }),
    ]);
    return {
      rutas: rutas.map((f) => ({
        id: f.ruta.id,
        codigo: f.ruta.codigo,
        nombre: f.ruta.nombre,
        color: f.ruta.color,
        guardadoEn: f.creadoEn,
      })),
      embarcaderos: embarcaderos.map((f) => ({
        id: f.embarcadero.id,
        nombre: f.embarcadero.nombre,
        referencia: f.embarcadero.referencia,
        estado: f.embarcadero.estado,
        latitud: f.embarcadero.ubicacion.coordinates[1],
        longitud: f.embarcadero.ubicacion.coordinates[0],
        guardadoEn: f.creadoEn,
      })),
    };
  }

  // Idempotente: guardar dos veces lo mismo no es un error
  async agregar(usuarioId: string, tipo: TipoFavorito, id: string) {
    if (tipo === 'ruta') {
      const existe = await this.rutasRepo.existsBy({
        id,
        estado: EstadoRuta.ACTIVA,
      });
      if (!existe) {
        throw new NotFoundException({
          code: 'RUTA_NO_ENCONTRADA',
          message: 'Ruta no encontrada',
        });
      }
      await this.rutas.upsert({ usuarioId, rutaId: id }, [
        'usuarioId',
        'rutaId',
      ]);
    } else {
      const existe = await this.embarcaderosRepo.existsBy({
        id,
        estado: Not(EstadoEmbarcadero.INACTIVO),
      });
      if (!existe) {
        throw new NotFoundException({
          code: 'EMBARCADERO_NO_ENCONTRADO',
          message: 'Embarcadero no encontrado',
        });
      }
      await this.embarcaderos.upsert({ usuarioId, embarcaderoId: id }, [
        'usuarioId',
        'embarcaderoId',
      ]);
    }
    return this.listar(usuarioId);
  }

  // Idempotente: quitar algo que no estaba guardado tampoco es un error
  async quitar(
    usuarioId: string,
    tipo: TipoFavorito,
    id: string,
  ): Promise<void> {
    if (tipo === 'ruta') await this.rutas.delete({ usuarioId, rutaId: id });
    else await this.embarcaderos.delete({ usuarioId, embarcaderoId: id });
  }
}
