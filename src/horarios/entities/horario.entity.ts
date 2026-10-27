import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { TipoDia } from '../../common/enums.js';
import { RutaSentido } from '../../rutas/entities/ruta-sentido.entity.js';

// Hora de salida programada de un sentido para un tipo de día.
@Entity('horarios')
@Unique('uq_horario', ['rutaSentidoId', 'tipoDia', 'horaSalida'])
export class Horario {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'ruta_sentido_id', type: 'uuid' })
  rutaSentidoId: string;

  @ManyToOne(() => RutaSentido, (rs) => rs.horarios, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ruta_sentido_id' })
  rutaSentido: Relation<RutaSentido>;

  @Column({ name: 'tipo_dia', type: 'enum', enum: TipoDia })
  tipoDia: TipoDia;

  // Hora local de Montería (America/Bogota), formato HH:MM:SS
  @Column({ name: 'hora_salida', type: 'time' })
  horaSalida: string;

  @CreateDateColumn({ name: 'creado_en', type: 'timestamptz' })
  creadoEn: Date;
}
