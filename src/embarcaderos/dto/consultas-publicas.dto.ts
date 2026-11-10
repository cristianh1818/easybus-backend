import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsLatitude, IsLongitude, IsOptional, Max, Min } from 'class-validator';
import { TipoEmbarcadero } from '../../common/enums.js';

export class FiltroPublicoEmbarcaderosDto {
  @ApiPropertyOptional({ enum: TipoEmbarcadero, description: 'Por defecto, todos los tipos' })
  @IsOptional()
  @IsEnum(TipoEmbarcadero)
  tipo?: TipoEmbarcadero;
}

export class CercanosDto extends FiltroPublicoEmbarcaderosDto {
  @ApiProperty({ example: 8.7545, description: 'Latitud del punto de búsqueda' })
  @Type(() => Number)
  @IsLatitude({ message: 'lat no es una latitud válida' })
  lat: number;

  @ApiProperty({ example: -75.8835, description: 'Longitud del punto de búsqueda' })
  @Type(() => Number)
  @IsLongitude({ message: 'lng no es una longitud válida' })
  lng: number;

  @ApiPropertyOptional({ example: 500, default: 500, minimum: 50, maximum: 5000, description: 'Radio en metros' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'radio debe ser un número entero de metros' })
  @Min(50, { message: 'radio debe ser de al menos 50 m' })
  @Max(5000, { message: 'radio no puede superar 5000 m' })
  radio: number = 500;

  @ApiPropertyOptional({ default: 10, minimum: 1, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limite: number = 10;
}
