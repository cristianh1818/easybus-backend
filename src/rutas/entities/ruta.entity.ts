import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { EstadoRuta, ModoTransporte } from '../../common/enums.js';
import { RutaSentido } from './ruta-sentido.entity.js';

// Datos generales de una ruta fluvial del Businú.
@Entity('rutas')
export class Ruta {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 20, unique: true })
  codigo: string;

  @Column({ length: 120 })
  nombre: string;

  @Column({ type: 'text', nullable: true })
  descripcion: string | null;

  // Color para dibujar la ruta en el mapa, formato #RRGGBB
  @Column({ type: 'varchar', length: 7, nullable: true })
  color: string | null;

  @Column({ type: 'enum', enum: EstadoRuta, default: EstadoRuta.ACTIVA })
  estado: EstadoRuta;

  // Fluvial (Businú) en la fase 1; bus en la fase 2
  @Column({ type: 'enum', enum: ModoTransporte, default: ModoTransporte.FLUVIAL })
  modo: ModoTransporte;

  // false = dato de ejemplo / no verificado con el operador
  @Column({ name: 'es_oficial', default: false })
  esOficial: boolean;

  @OneToMany(() => RutaSentido, (sentido) => sentido.ruta)
  sentidos: Relation<RutaSentido[]>;

  @CreateDateColumn({ name: 'creado_en', type: 'timestamptz' })
  creadoEn: Date;

  @UpdateDateColumn({ name: 'actualizado_en', type: 'timestamptz' })
  actualizadoEn: Date;
}
