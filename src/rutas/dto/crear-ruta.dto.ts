import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';
import { EstadoRuta } from '../../common/enums.js';

export class CrearRutaDto {
  @ApiProperty({ example: 'F1', description: 'Código corto y único de la ruta' })
  @IsString()
  @Length(1, 20)
  @Matches(/^[A-Za-z0-9-]+$/, { message: 'codigo solo admite letras, números y guiones' })
  codigo: string;

  @ApiProperty({ example: 'Norte - Centro' })
  @IsString()
  @Length(2, 120)
  nombre: string;

  @ApiPropertyOptional({ example: 'Recorrido fluvial por el río Sinú entre el norte y el centro de Montería' })
  @IsOptional()
  @IsString()
  descripcion?: string;

  @ApiPropertyOptional({ example: '#1E88E5', description: 'Color en el mapa, formato #RRGGBB' })
  @IsOptional()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'color debe tener el formato #RRGGBB' })
  color?: string;

  @ApiPropertyOptional({ enum: EstadoRuta, default: EstadoRuta.ACTIVA })
  @IsOptional()
  @IsEnum(EstadoRuta)
  estado?: EstadoRuta;

  @ApiPropertyOptional({ default: false, description: 'true si el dato está verificado con el operador' })
  @IsOptional()
  @IsBoolean()
  esOficial?: boolean;
}
