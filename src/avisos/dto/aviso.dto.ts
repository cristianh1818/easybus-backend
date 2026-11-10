import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsEnum, IsISO8601, IsOptional, IsString, IsUUID, Length } from 'class-validator';
import { MotivoAviso, TipoAviso, VigenciaAviso } from '../../common/enums.js';
import { PaginacionDto } from '../../common/dto/paginacion.dto.js';

const FECHA_AYUDA = 'Fecha y hora ISO. Sin zona horaria se toma como hora de Montería (ej. 2026-11-12T06:00).';

export class CrearAvisoDto {
  @ApiProperty({ enum: TipoAviso, example: TipoAviso.SUSPENDIDO })
  @IsEnum(TipoAviso)
  tipo: TipoAviso;

  @ApiPropertyOptional({ enum: MotivoAviso, default: MotivoAviso.OTRO, example: MotivoAviso.NIVEL_RIO })
  @IsOptional()
  @IsEnum(MotivoAviso)
  motivo?: MotivoAviso;

  @ApiProperty({ example: 'Servicio suspendido por creciente del río' })
  @IsString()
  @Length(3, 120, { message: 'El título debe tener entre 3 y 120 caracteres' })
  titulo: string;

  @ApiProperty({ example: 'Por el nivel alto del río Sinú no hay zarpes hasta nuevo aviso.' })
  @IsString()
  @Length(5, 1000, { message: 'El mensaje debe tener entre 5 y 1000 caracteres' })
  mensaje: string;

  @ApiPropertyOptional({ description: 'Ruta afectada. Sin ruta ni embarcadero, el aviso aplica a todo el servicio.' })
  @IsOptional()
  @IsUUID('all')
  rutaId?: string | null;

  @ApiPropertyOptional({ description: 'Embarcadero afectado' })
  @IsOptional()
  @IsUUID('all')
  embarcaderoId?: string | null;

  @ApiPropertyOptional({ example: '2026-11-12T06:00', description: `${FECHA_AYUDA} Por defecto, ahora.` })
  @IsOptional()
  @IsISO8601({}, { message: 'vigenteDesde debe ser una fecha y hora ISO' })
  vigenteDesde?: string;

  @ApiPropertyOptional({ example: '2026-11-12T18:00', description: `${FECHA_AYUDA} Vacío = hasta que se cierre.` })
  @IsOptional()
  @IsISO8601({}, { message: 'vigenteHasta debe ser una fecha y hora ISO' })
  vigenteHasta?: string | null;
}

export class ActualizarAvisoDto extends PartialType(CrearAvisoDto) {}

export class FiltroAvisosAdminDto extends PaginacionDto {
  @ApiPropertyOptional({ enum: VigenciaAviso, description: 'Vacío = todos' })
  @IsOptional()
  @IsEnum(VigenciaAviso)
  vigencia?: VigenciaAviso;

  @ApiPropertyOptional({ enum: TipoAviso })
  @IsOptional()
  @IsEnum(TipoAviso)
  tipo?: TipoAviso;
}

export class FiltroAvisosPublicoDto {
  @ApiPropertyOptional({ description: 'Avisos que afectan a esta ruta (incluye los generales y los de sus embarcaderos)' })
  @IsOptional()
  @IsUUID('all')
  rutaId?: string;

  @ApiPropertyOptional({ description: 'Avisos que afectan a este embarcadero (incluye los generales y los de sus rutas)' })
  @IsOptional()
  @IsUUID('all')
  embarcaderoId?: string;
}
