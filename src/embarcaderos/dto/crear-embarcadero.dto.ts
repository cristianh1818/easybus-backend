import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  MaxLength,
} from 'class-validator';
import { EstadoEmbarcadero, Margen, TipoEmbarcadero } from '../../common/enums.js';

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

  @ApiPropertyOptional({ enum: TipoEmbarcadero, default: TipoEmbarcadero.EMBARCADERO })
  @IsOptional()
  @IsEnum(TipoEmbarcadero)
  tipo?: TipoEmbarcadero;

  @ApiPropertyOptional({ enum: Margen, nullable: true, description: 'Orilla del río (null = sin dato)' })
  @IsOptional()
  @IsEnum(Margen)
  margen?: Margen | null;

  @ApiPropertyOptional({ enum: EstadoEmbarcadero, default: EstadoEmbarcadero.ACTIVO })
  @IsOptional()
  @IsEnum(EstadoEmbarcadero)
  estado?: EstadoEmbarcadero;

  @ApiPropertyOptional({ nullable: true, description: 'true / false / null = sin dato' })
  @IsOptional()
  @IsBoolean()
  tieneRampa?: boolean | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsBoolean()
  tieneTecho?: boolean | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsBoolean()
  tieneIluminacion?: boolean | null;

  @ApiPropertyOptional({ example: 'https://ejemplo.com/foto.jpg', nullable: true })
  @IsOptional()
  @IsUrl({ require_protocol: true }, { message: 'fotoUrl debe ser una URL completa (https://…)' })
  @MaxLength(500)
  fotoUrl?: string | null;

  @ApiPropertyOptional({ default: false, description: 'true si el dato está verificado con el operador' })
  @IsOptional()
  @IsBoolean()
  esOficial?: boolean;
}
