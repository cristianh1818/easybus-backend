import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Auditoria } from './entities/auditoria.entity.js';
import { AccionAuditoria } from '../common/enums.js';
import { FiltroAuditoriaDto } from './dto/filtro-auditoria.dto.js';

export interface DatosAuditoria {
  usuarioId: string;
  entidad: string;
  entidadId: string;
  accion: AccionAuditoria;
  datosPrevios?: Record<string, unknown> | null;
  datosNuevos?: Record<string, unknown> | null;
}

@Injectable()
export class AuditoriaService {
  constructor(
    @InjectRepository(Auditoria) private readonly repo: Repository<Auditoria>,
  ) {}

  // Guarda un registro de auditoría. Si se pasa un "manager" se guarda dentro de la
  // misma transacción del cambio: o se guardan los dos, o ninguno.
  async registrar(datos: DatosAuditoria, manager?: EntityManager): Promise<void> {
    const repo = manager ? manager.getRepository(Auditoria) : this.repo;
    await repo.save(
      repo.create({
        usuarioId: datos.usuarioId,
        entidad: datos.entidad,
        entidadId: datos.entidadId,
        accion: datos.accion,
        datosPrevios: datos.datosPrevios ?? null,
        datosNuevos: datos.datosNuevos ?? null,
      }),
    );
  }

  async listar(filtro: FiltroAuditoriaDto) {
    const qb = this.repo
      .createQueryBuilder('a')
      .leftJoin('a.usuario', 'u')
      .addSelect(['u.id', 'u.nombre', 'u.correo'])
      .orderBy('a.creadoEn', 'DESC')
      .skip((filtro.pagina - 1) * filtro.limite)
      .take(filtro.limite);

    if (filtro.entidad) qb.andWhere('a.entidad = :entidad', { entidad: filtro.entidad });
    if (filtro.entidadId) qb.andWhere('a.entidadId = :eid', { eid: filtro.entidadId });
    if (filtro.usuarioId) qb.andWhere('a.usuarioId = :uid', { uid: filtro.usuarioId });
    if (filtro.accion) qb.andWhere('a.accion = :accion', { accion: filtro.accion });

    const [datos, total] = await qb.getManyAndCount();
    return { total, pagina: filtro.pagina, limite: filtro.limite, datos };
  }
}
