import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { EstadoReporte, TipoReporte } from '../../common/enums.js';
import { Usuario } from '../../usuarios/entities/usuario.entity.js';
import { Ruta } from '../../rutas/entities/ruta.entity.js';
import { Embarcadero } from '../../embarcaderos/entities/embarcadero.entity.js';

// Error de datos reportado por un usuario (con o sin cuenta).
@Entity('reportes')
export class Reporte {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'usuario_id', type: 'uuid', nullable: true })
  usuarioId: string | null;

  @ManyToOne(() => Usuario, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'usuario_id' })
  usuario: Relation<Usuario> | null;

  @Column({ name: 'ruta_id', type: 'uuid', nullable: true })
  rutaId: string | null;

  @ManyToOne(() => Ruta, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'ruta_id' })
  ruta: Relation<Ruta> | null;

  @Column({ name: 'embarcadero_id', type: 'uuid', nullable: true })
  embarcaderoId: string | null;

  @ManyToOne(() => Embarcadero, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'embarcadero_id' })
  embarcadero: Relation<Embarcadero> | null;

  @Column({ type: 'enum', enum: TipoReporte })
  tipo: TipoReporte;

  @Column({ type: 'text' })
  descripcion: string;

  @Column({ type: 'enum', enum: EstadoReporte, default: EstadoReporte.PENDIENTE })
  estado: EstadoReporte;

  // Nota interna del administrador al gestionar el reporte
  @Column({ name: 'respuesta_admin', type: 'text', nullable: true })
  respuestaAdmin: string | null;

  @CreateDateColumn({ name: 'creado_en', type: 'timestamptz' })
  creadoEn: Date;

  @UpdateDateColumn({ name: 'actualizado_en', type: 'timestamptz' })
  actualizadoEn: Date;
}
