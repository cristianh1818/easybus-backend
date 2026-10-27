import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Rol } from '../../common/enums.js';

@Entity('usuarios')
export class Usuario {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 120 })
  nombre: string;

  @Column({ length: 160, unique: true })
  correo: string;

  // Nunca se guarda la contraseña, solo su hash (bcrypt).
  // select: false -> no se devuelve en las consultas salvo que se pida explícitamente.
  @Column({ name: 'contrasena_hash', select: false })
  contrasenaHash: string;

  @Column({ type: 'enum', enum: Rol, default: Rol.PASAJERO })
  rol: Rol;

  @Column({ default: true })
  activo: boolean;

  @CreateDateColumn({ name: 'creado_en', type: 'timestamptz' })
  creadoEn: Date;
}
