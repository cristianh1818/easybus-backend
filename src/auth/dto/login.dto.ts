import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin@easybus.co' })
  @IsEmail({}, { message: 'El correo no es válido' })
  correo: string;

  @ApiProperty({ example: 'Admin123*' })
  @IsString()
  @MinLength(1, { message: 'La contraseña es obligatoria' })
  password: string;
}
