import {
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { Usuario } from './usuario.entity.js';
import { Embarcadero } from '../../embarcaderos/entities/embarcadero.entity.js';

// Embarcaderos guardados por un pasajero. La clave es la pareja (usuario, embarcadero).
// Las rutas favoritas están en la tabla "favoritos" (Favorito).
@Entity('favoritos_embarcaderos')
export class FavoritoEmbarcadero {
  @PrimaryColumn({ name: 'usuario_id', type: 'uuid' })
  usuarioId: string;

  @PrimaryColumn({ name: 'embarcadero_id', type: 'uuid' })
  embarcaderoId: string;

  @ManyToOne(() => Usuario, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'usuario_id' })
  usuario: Relation<Usuario>;

  @ManyToOne(() => Embarcadero, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'embarcadero_id' })
  embarcadero: Relation<Embarcadero>;

  @CreateDateColumn({ name: 'creado_en', type: 'timestamptz' })
  creadoEn: Date;
}
