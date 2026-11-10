import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { MotivoAviso, TipoAviso } from '../../common/enums.js';
import { Ruta } from '../../rutas/entities/ruta.entity.js';
import { Embarcadero } from '../../embarcaderos/entities/embarcadero.entity.js';
import { Usuario } from '../../usuarios/entities/usuario.entity.js';

// Aviso de servicio (suspensión por nivel del río, retrasos, cambios de horario…).
// Alcance según los campos que tenga:
//   sin ruta ni embarcadero -> todo el servicio
//   solo ruta               -> esa ruta
//   solo embarcadero        -> ese embarcadero (en todas las rutas que lo atienden)
//   ruta y embarcadero      -> ese embarcadero dentro de esa ruta
@Entity('avisos_servicio')
@Index('ix_avisos_vigencia', ['vigenteDesde', 'vigenteHasta'])
@Check('ck_avisos_fechas', '"vigente_hasta" IS NULL OR "vigente_hasta" > "vigente_desde"')
export class AvisoServicio {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: TipoAviso })
  tipo: TipoAviso;

  @Column({ type: 'enum', enum: MotivoAviso, default: MotivoAviso.OTRO })
  motivo: MotivoAviso;

  @Column({ length: 120 })
  titulo: string;

  @Column({ type: 'text' })
  mensaje: string;

  @Column({ name: 'ruta_id', type: 'uuid', nullable: true })
  rutaId: string | null;

  // Si se borra la ruta o el embarcadero, sus avisos ya no tienen sentido
  @ManyToOne(() => Ruta, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ruta_id' })
  ruta: Relation<Ruta> | null;

  @Column({ name: 'embarcadero_id', type: 'uuid', nullable: true })
  embarcaderoId: string | null;

  @ManyToOne(() => Embarcadero, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'embarcadero_id' })
  embarcadero: Relation<Embarcadero> | null;

  @Column({ name: 'vigente_desde', type: 'timestamptz' })
  vigenteDesde: Date;

  // null = hasta que un administrador lo cierre
  @Column({ name: 'vigente_hasta', type: 'timestamptz', nullable: true })
  vigenteHasta: Date | null;

  @Column({ name: 'creado_por', type: 'uuid', nullable: true })
  creadoPor: string | null;

  @ManyToOne(() => Usuario, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'creado_por' })
  autor: Relation<Usuario> | null;

  @CreateDateColumn({ name: 'creado_en', type: 'timestamptz' })
  creadoEn: Date;

  @UpdateDateColumn({ name: 'actualizado_en', type: 'timestamptz' })
  actualizadoEn: Date;
}
