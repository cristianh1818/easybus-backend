import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { Point } from 'typeorm';

// Lugar físico donde la embarcación recoge y deja pasajeros (equivale a "parada").
@Entity('embarcaderos')
export class Embarcadero {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 120 })
  nombre: string;

  // Punto de referencia para ubicarlo (ej. "Frente a la Ronda del Sinú")
  @Column({ type: 'varchar', length: 200, nullable: true })
  referencia: string | null;

  // Coordenadas WGS 84 (SRID 4326). En GeoJSON el orden es [longitud, latitud].
  @Index({ spatial: true })
  @Column({ type: 'geometry', spatialFeatureType: 'Point', srid: 4326 })
  ubicacion: Point;

  @Column({ default: true })
  activo: boolean;

  // false = dato de ejemplo / no verificado con el operador
  @Column({ name: 'es_oficial', default: false })
  esOficial: boolean;

  @CreateDateColumn({ name: 'creado_en', type: 'timestamptz' })
  creadoEn: Date;

  @UpdateDateColumn({ name: 'actualizado_en', type: 'timestamptz' })
  actualizadoEn: Date;
}
