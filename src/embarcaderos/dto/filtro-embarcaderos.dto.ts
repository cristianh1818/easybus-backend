import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { EstadoEmbarcadero } from '../../common/enums.js';

export class FiltroEmbarcaderosDto {
  @ApiPropertyOptional({ enum: EstadoEmbarcadero, description: 'Filtrar por estado' })
  @IsOptional()
  @IsEnum(EstadoEmbarcadero)
  estado?: EstadoEmbarcadero;
}
