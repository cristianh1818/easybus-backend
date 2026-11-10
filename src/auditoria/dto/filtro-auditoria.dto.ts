import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginacionDto } from '../../common/dto/paginacion.dto.js';
import { AccionAuditoria } from '../../common/enums.js';

export const ENTIDADES_AUDITADAS = [
  'rutas',
  'ruta_sentidos',
  'ruta_embarcaderos',
  'embarcaderos',
  'horarios',
  'dias_festivos',
  'reportes',
  'avisos_servicio',
] as const;

export class FiltroAuditoriaDto extends PaginacionDto {
  @ApiPropertyOptional({ enum: ENTIDADES_AUDITADAS })
  @IsOptional()
  @IsIn(ENTIDADES_AUDITADAS)
  entidad?: string;

  @ApiPropertyOptional({ description: 'Id del registro afectado' })
  @IsOptional()
  @IsString()
  entidadId?: string;

  @ApiPropertyOptional({ description: 'Id del administrador que hizo el cambio' })
  @IsOptional()
  @IsUUID('all')
  usuarioId?: string;

  @ApiPropertyOptional({ enum: AccionAuditoria })
  @IsOptional()
  @IsEnum(AccionAuditoria)
  accion?: AccionAuditoria;
}
