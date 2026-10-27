import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { AccionAuditoria } from '../../common/enums.js';
import { Usuario } from '../../usuarios/entities/usuario.entity.js';

// Registro de cada cambio hecho por un administrador: quién, qué, cuándo y el valor anterior.
@Entity('auditoria')
@Index('ix_auditoria_entidad', ['entidad', 'entidadId'])
export class Auditoria {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'usuario_id', type: 'uuid', nullable: true })
  usuarioId: string | null;

  @ManyToOne(() => Usuario, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'usuario_id' })
  usuario: Relation<Usuario> | null;

  // Tabla afectada, ej. "rutas", "embarcaderos", "horarios"
  @Column({ length: 60 })
  entidad: string;

  @Column({ name: 'entidad_id', length: 80 })
  entidadId: string;

  @Column({ type: 'enum', enum: AccionAuditoria })
  accion: AccionAuditoria;

  @Column({ name: 'datos_previos', type: 'jsonb', nullable: true })
  datosPrevios: Record<string, unknown> | null;

  @Column({ name: 'datos_nuevos', type: 'jsonb', nullable: true })
  datosNuevos: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'creado_en', type: 'timestamptz' })
  creadoEn: Date;
}
