// Consultas públicas de embarcaderos (sin iniciar sesión): lista, detalle con las rutas
// que lo atienden y búsqueda por cercanía con PostGIS. Nunca muestran embarcaderos inactivos.

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, Repository } from 'typeorm';
import { Embarcadero } from './entities/embarcadero.entity.js';
import { RutaEmbarcadero } from '../rutas/entities/ruta-embarcadero.entity.js';
import { formatearEmbarcadero } from './embarcadero.mapper.js';
import { CercanosDto, FiltroPublicoEmbarcaderosDto } from './dto/consultas-publicas.dto.js';
import { EstadoEmbarcadero, EstadoRuta } from '../common/enums.js';

const VISIBLE = Not(EstadoEmbarcadero.INACTIVO);

@Injectable()
export class EmbarcaderosPublicoService {
  constructor(
    @InjectRepository(Embarcadero) private readonly repo: Repository<Embarcadero>,
    @InjectRepository(RutaEmbarcadero) private readonly asignaciones: Repository<RutaEmbarcadero>,
  ) {}

  // Activos y cerrados temporalmente (estos últimos se muestran con su estado)
  async listar(filtro: FiltroPublicoEmbarcaderosDto) {
    const lista = await this.repo.find({
      where: { estado: VISIBLE, ...(filtro.tipo ? { tipo: filtro.tipo } : {}) },
      order: { nombre: 'ASC' },
    });
    return lista.map(formatearEmbarcadero);
  }

  // Detalle + rutas activas que pasan por él, con su posición y minutos desde el origen
  async detalle(id: string) {
    const e = await this.repo.findOneBy({ id, estado: VISIBLE });
    if (!e) throw new NotFoundException('Embarcadero no encontrado');

    const asignaciones = await this.asignaciones.find({
      where: { embarcaderoId: id, rutaSentido: { ruta: { estado: EstadoRuta.ACTIVA } } },
      relations: { rutaSentido: { ruta: true } },
    });

    // Cuántos embarcaderos tiene cada sentido, para mostrar "parada 3 de 5"
    const sentidoIds = asignaciones.map((a) => a.rutaSentidoId);
    const totales = new Map<string, number>();
    if (sentidoIds.length > 0) {
      const filas = await this.asignaciones
        .createQueryBuilder('re')
        .select('re.rutaSentidoId', 'id')
        .addSelect('count(*)::int', 'total')
        .where({ rutaSentidoId: In(sentidoIds) })
        .groupBy('re.rutaSentidoId')
        .getRawMany<{ id: string; total: number }>();
      filas.forEach((f) => totales.set(f.id, f.total));
    }

    const rutas = asignaciones
      .map((a) => {
        const rs = a.rutaSentido;
        return {
          ruta: {
            id: rs.ruta.id,
            codigo: rs.ruta.codigo,
            nombre: rs.ruta.nombre,
            color: rs.ruta.color,
            modo: rs.ruta.modo,
          },
          sentido: rs.sentido,
          destino: rs.destino,
          orden: a.orden,
          totalEmbarcaderos: totales.get(a.rutaSentidoId) ?? null,
          esOrigen: a.orden === 1,
          minutosDesdeOrigen: a.minutosDesdeOrigen,
          tiempoEstimado: a.tiempoEstimado,
        };
      })
      .sort((x, y) => x.ruta.codigo.localeCompare(y.ruta.codigo) || x.sentido.localeCompare(y.sentido));

    return { ...formatearEmbarcadero(e), rutas };
  }

  // Embarcaderos dentro de un radio (en metros) alrededor de un punto, del más cercano al más lejano.
  // ST_DWithin y ST_Distance sobre geography miden en metros reales sobre la Tierra.
  async cercanos(q: CercanosDto) {
    const filas = await this.repo.query<{ id: string; distancia_m: number }[]>(
      `SELECT id,
              ST_Distance(ubicacion::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) AS distancia_m
       FROM embarcaderos
       WHERE estado <> 'inactivo'
         AND ($5::text IS NULL OR tipo::text = $5)
         AND ST_DWithin(ubicacion::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, $3)
       ORDER BY distancia_m
       LIMIT $4`,
      [q.lng, q.lat, q.radio, q.limite, q.tipo ?? null],
    );

    const porId = new Map(
      (await this.repo.findBy({ id: In(filas.map((f) => f.id)) })).map((e) => [e.id, e]),
    );
    return {
      centro: { lat: q.lat, lng: q.lng },
      radioM: q.radio,
      total: filas.length,
      embarcaderos: filas.map((f) => ({
        distanciaM: Math.round(Number(f.distancia_m)),
        ...formatearEmbarcadero(porId.get(f.id)!),
      })),
    };
  }
}
