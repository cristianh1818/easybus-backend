import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import type { LineString, Relation } from 'typeorm';
import { Sentido } from '../../common/enums.js';
import { Ruta } from './ruta.entity.js';
import { RutaEmbarcadero } from './ruta-embarcadero.entity.js';
import { Horario } from '../../horarios/entities/horario.entity.js';

// Cada ruta tiene dos sentidos (ida y vuelta).
// El trazado, la secuencia de embarcaderos y los horarios pertenecen al sentido.
@Entity('ruta_sentidos')
@Unique('uq_ruta_sentido', ['rutaId', 'sentido'])
export class RutaSentido {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'ruta_id', type: 'uuid' })
  rutaId: string;

  @ManyToOne(() => Ruta, (ruta) => ruta.sentidos, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ruta_id' })
  ruta: Relation<Ruta>;

  @Column({ type: 'enum', enum: Sentido })
  sentido: Sentido;

  // Embarcadero o lugar hacia donde va este sentido
  @Column({ length: 120 })
  destino: string;

  // Recorrido sobre el río como línea geográfica (WGS 84, SRID 4326)
  @Index({ spatial: true })
  @Column({
    type: 'geometry',
    spatialFeatureType: 'LineString',
    srid: 4326,
    nullable: true,
  })
  trazado: LineString | null;

  @OneToMany(() => RutaEmbarcadero, (re) => re.rutaSentido)
  embarcaderos: Relation<RutaEmbarcadero[]>;

  @OneToMany(() => Horario, (h) => h.rutaSentido)
  horarios: Relation<Horario[]>;

  @UpdateDateColumn({ name: 'actualizado_en', type: 'timestamptz' })
  actualizadoEn: Date;
}
