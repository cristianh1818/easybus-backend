import { Column, Entity, PrimaryColumn } from 'typeorm';

// Festivos de Colombia: ese día se aplica el horario de domingo/festivo.
@Entity('dias_festivos')
export class DiaFestivo {
  // La fecha misma es la clave: no puede haber dos festivos el mismo día
  @PrimaryColumn({ type: 'date' })
  fecha: string;

  @Column({ length: 120 })
  nombre: string;
}
