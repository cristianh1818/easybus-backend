import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EstadoEmbarcacion, TipoEmbarcacion } from '../../common/enums.js';

// Embarcación del Businú. Sin GPS en la beta: solo inventario y estado.
@Entity('embarcaciones')
@Check('ck_embarcaciones_capacidad', '"capacidad" > 0')
export class Embarcacion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Identificador visible (el que lleva pintado la embarcación), ej. "BN-01"
  @Column({ length: 20, unique: true })
  codigo: string;

  @Column({ length: 120 })
  nombre: string;

  // Número máximo de pasajeros
  @Column({ type: 'smallint' })
  capacidad: number;

  @Column({ type: 'enum', enum: EstadoEmbarcacion, default: EstadoEmbarcacion.OPERATIVA })
  estado: EstadoEmbarcacion;

  // Embarcación (fase 1) o bus (fase 2)
  @Column({ type: 'enum', enum: TipoEmbarcacion, default: TipoEmbarcacion.EMBARCACION })
  tipo: TipoEmbarcacion;

  @Column({ type: 'text', nullable: true })
  observaciones: string | null;

  // false = dato de ejemplo / no verificado con el operador
  @Column({ name: 'es_oficial', default: false })
  esOficial: boolean;

  @CreateDateColumn({ name: 'creado_en', type: 'timestamptz' })
  creadoEn: Date;

  @UpdateDateColumn({ name: 'actualizado_en', type: 'timestamptz' })
  actualizadoEn: Date;
}
