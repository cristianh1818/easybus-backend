import {
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { Usuario } from './usuario.entity.js';
import { Ruta } from '../../rutas/entities/ruta.entity.js';

// Rutas guardadas por un pasajero. La clave es la pareja (usuario, ruta).
@Entity('favoritos')
export class Favorito {
  @PrimaryColumn({ name: 'usuario_id', type: 'uuid' })
  usuarioId: string;

  @PrimaryColumn({ name: 'ruta_id', type: 'uuid' })
  rutaId: string;

  @ManyToOne(() => Usuario, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'usuario_id' })
  usuario: Relation<Usuario>;

  @ManyToOne(() => Ruta, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ruta_id' })
  ruta: Relation<Ruta>;

  @CreateDateColumn({ name: 'creado_en', type: 'timestamptz' })
  creadoEn: Date;
}
