import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';

export class CrearEmbarcaderoDto {
  @ApiProperty({ example: 'Embarcadero Calle 30' })
  @IsString()
  @Length(2, 120)
  nombre: string;

  @ApiPropertyOptional({ example: 'Ronda del Sinú, frente a la Calle 30' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  referencia?: string;

  @ApiProperty({ example: 8.7535, description: 'Latitud WGS 84' })
  @IsLatitude({ message: 'latitud no es válida' })
  latitud: number;

  @ApiProperty({ example: -75.8851, description: 'Longitud WGS 84' })
  @IsLongitude({ message: 'longitud no es válida' })
  longitud: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  @ApiPropertyOptional({ default: false, description: 'true si el dato está verificado con el operador' })
  @IsOptional()
  @IsBoolean()
  esOficial?: boolean;
}
