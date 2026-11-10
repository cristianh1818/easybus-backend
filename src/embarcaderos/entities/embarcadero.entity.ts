import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { Point } from 'typeorm';
import { EstadoEmbarcadero, Margen, TipoEmbarcadero } from '../../common/enums.js';

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

  // Embarcadero (fase 1) o parada de bus (fase 2)
  @Column({ type: 'enum', enum: TipoEmbarcadero, default: TipoEmbarcadero.EMBARCADERO })
  tipo: TipoEmbarcadero;

  // Orilla del río; vacío si no se ha registrado
  @Column({ type: 'enum', enum: Margen, nullable: true })
  margen: Margen | null;

  @Column({ type: 'enum', enum: EstadoEmbarcadero, default: EstadoEmbarcadero.ACTIVO })
  estado: EstadoEmbarcadero;

  // Accesibilidad: true = sí, false = no, null = sin dato
  @Column({ name: 'tiene_rampa', type: 'boolean', nullable: true })
  tieneRampa: boolean | null;

  @Column({ name: 'tiene_techo', type: 'boolean', nullable: true })
  tieneTecho: boolean | null;

  @Column({ name: 'tiene_iluminacion', type: 'boolean', nullable: true })
  tieneIluminacion: boolean | null;

  @Column({ name: 'foto_url', type: 'varchar', length: 500, nullable: true })
  fotoUrl: string | null;

  // false = dato de ejemplo / no verificado con el operador
  @Column({ name: 'es_oficial', default: false })
  esOficial: boolean;

  @CreateDateColumn({ name: 'creado_en', type: 'timestamptz' })
  creadoEn: Date;

  @UpdateDateColumn({ name: 'actualizado_en', type: 'timestamptz' })
  actualizadoEn: Date;
}
