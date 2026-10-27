import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn, Unique } from 'typeorm';
import type { Relation } from 'typeorm';
import { RutaSentido } from './ruta-sentido.entity.js';
import { Embarcadero } from '../../embarcaderos/entities/embarcadero.entity.js';

// Secuencia de embarcaderos en cada sentido de una ruta.
// Un embarcadero aparece una sola vez por sentido y cada posición (orden) es única.
@Entity('ruta_embarcaderos')
@Unique('uq_ruta_sentido_orden', ['rutaSentidoId', 'orden'])
export class RutaEmbarcadero {
  @PrimaryColumn({ name: 'ruta_sentido_id', type: 'uuid' })
  rutaSentidoId: string;

  @PrimaryColumn({ name: 'embarcadero_id', type: 'uuid' })
  embarcaderoId: string;

  @Column({ type: 'smallint' })
  orden: number;

  @ManyToOne(() => RutaSentido, (rs) => rs.embarcaderos, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ruta_sentido_id' })
  rutaSentido: Relation<RutaSentido>;

  // RESTRICT: no se puede borrar un embarcadero mientras esté asignado a una ruta
  @ManyToOne(() => Embarcadero, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'embarcadero_id' })
  embarcadero: Relation<Embarcadero>;
}
