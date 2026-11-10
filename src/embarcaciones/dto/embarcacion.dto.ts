import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { EstadoEmbarcacion, TipoEmbarcacion } from '../../common/enums.js';

export class CrearEmbarcacionDto {
  @ApiProperty({ example: 'BN-01', description: 'Código único, el que lleva pintado la embarcación' })
  @IsString()
  @Length(1, 20, { message: 'El código debe tener entre 1 y 20 caracteres' })
  @Matches(/^[A-Za-z0-9-]+$/, { message: 'El código solo admite letras, números y guiones' })
  codigo: string;

  @ApiProperty({ example: 'Businú I' })
  @IsString()
  @Length(2, 120, { message: 'El nombre debe tener entre 2 y 120 caracteres' })
  nombre: string;

  @ApiProperty({ example: 40, description: 'Número máximo de pasajeros' })
  @IsInt({ message: 'La capacidad debe ser un número entero' })
  @Min(1, { message: 'La capacidad debe ser de al menos 1 pasajero' })
  @Max(500, { message: 'La capacidad no puede superar 500 pasajeros' })
  capacidad: number;

  @ApiPropertyOptional({ enum: EstadoEmbarcacion, default: EstadoEmbarcacion.OPERATIVA })
  @IsOptional()
  @IsEnum(EstadoEmbarcacion, { message: 'El estado debe ser "operativa" o "mantenimiento"' })
  estado?: EstadoEmbarcacion;

  @ApiPropertyOptional({ enum: TipoEmbarcacion, default: TipoEmbarcacion.EMBARCACION })
  @IsOptional()
  @IsEnum(TipoEmbarcacion)
  tipo?: TipoEmbarcacion;

  @ApiPropertyOptional({ example: 'Motor revisado en octubre' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  observaciones?: string | null;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  esOficial?: boolean;
}

export class ActualizarEmbarcacionDto extends PartialType(CrearEmbarcacionDto) {}

export class FiltroEmbarcacionesDto {
  @ApiPropertyOptional({ enum: EstadoEmbarcacion })
  @IsOptional()
  @IsEnum(EstadoEmbarcacion)
  estado?: EstadoEmbarcacion;
}
