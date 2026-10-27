import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Length, MaxLength } from 'class-validator';

// Registro público: siempre crea cuentas con rol pasajero
export class RegisterDto {
  @ApiProperty({ example: 'Ana Pérez' })
  @IsString()
  @Length(2, 120, { message: 'El nombre debe tener entre 2 y 120 caracteres' })
  nombre: string;

  @ApiProperty({ example: 'ana@correo.com' })
  @IsEmail({}, { message: 'El correo no es válido' })
  @MaxLength(160)
  correo: string;

  @ApiProperty({ example: 'ClaveSegura123', minLength: 8 })
  @IsString()
  @Length(8, 72, { message: 'La contraseña debe tener entre 8 y 72 caracteres' })
  password: string;
}
