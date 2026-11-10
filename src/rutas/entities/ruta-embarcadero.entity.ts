import { Check, Column, Entity, JoinColumn, ManyToOne, PrimaryColumn, Unique } from 'typeorm';
import type { Relation } from 'typeorm';
import { RutaSentido } from './ruta-sentido.entity.js';
import { Embarcadero } from '../../embarcaderos/entities/embarcadero.entity.js';

// Secuencia de embarcaderos en cada sentido de una ruta.
// Un embarcadero aparece una sola vez por sentido y cada posición (orden) es única.
@Entity('ruta_embarcaderos')
@Unique('uq_ruta_sentido_orden', ['rutaSentidoId', 'orden'])
@Check('ck_minutos_desde_origen', '"minutos_desde_origen" >= 0')
export class RutaEmbarcadero {
  @PrimaryColumn({ name: 'ruta_sentido_id', type: 'uuid' })
  rutaSentidoId: string;

  @PrimaryColumn({ name: 'embarcadero_id', type: 'uuid' })
  embarcaderoId: string;

  @Column({ type: 'smallint' })
  orden: number;

  // Minutos desde el zarpe en el primer embarcadero del sentido (el primero es 0).
  // Hora estimada de paso = hora de salida + minutos_desde_origen.
  @Column({ name: 'minutos_desde_origen', type: 'smallint', default: 0 })
  minutosDesdeOrigen: number;

  // true: calculado por distancia (10 min/km, se recalcula solo);
  // false: tiempo real registrado por el administrador (no se toca al recalcular)
  @Column({ name: 'tiempo_estimado', default: true })
  tiempoEstimado: boolean;

  @ManyToOne(() => RutaSentido, (rs) => rs.embarcaderos, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ruta_sentido_id' })
  rutaSentido: Relation<RutaSentido>;

  // RESTRICT: no se puede borrar un embarcadero mientras esté asignado a una ruta
  @ManyToOne(() => Embarcadero, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'embarcadero_id' })
  embarcadero: Relation<Embarcadero>;
}
