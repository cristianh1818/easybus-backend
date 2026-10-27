import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID, Length, MaxLength } from 'class-validator';
import { EstadoReporte, TipoReporte } from '../../common/enums.js';
import { PaginacionDto } from '../../common/dto/paginacion.dto.js';

export class CrearReporteDto {
  @ApiProperty({ enum: TipoReporte, example: TipoReporte.HORARIO })
  @IsEnum(TipoReporte)
  tipo: TipoReporte;

  @ApiProperty({ example: 'La salida de las 06:30 en sentido ida ya no existe, ahora sale a las 06:45' })
  @IsString()
  @Length(10, 1000, { message: 'La descripción debe tener entre 10 y 1000 caracteres' })
  descripcion: string;

  @ApiPropertyOptional({ description: 'Ruta a la que se refiere el reporte' })
  @IsOptional()
  @IsUUID('all')
  rutaId?: string;

  @ApiPropertyOptional({ description: 'Embarcadero al que se refiere el reporte' })
  @IsOptional()
  @IsUUID('all')
  embarcaderoId?: string;
}

export class GestionarReporteDto {
  @ApiProperty({ enum: EstadoReporte, example: EstadoReporte.RESUELTO })
  @IsEnum(EstadoReporte)
  estado: EstadoReporte;

  @ApiPropertyOptional({ example: 'Horario corregido el 27/10/2026' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  respuestaAdmin?: string;
}

export class FiltroReportesDto extends PaginacionDto {
  @ApiPropertyOptional({ enum: EstadoReporte })
  @IsOptional()
  @IsEnum(EstadoReporte)
  estado?: EstadoReporte;

  @ApiPropertyOptional({ enum: TipoReporte })
  @IsOptional()
  @IsEnum(TipoReporte)
  tipo?: TipoReporte;
}
