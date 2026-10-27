import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { EstadoRuta } from '../../common/enums.js';

export class FiltroRutasDto {
  @ApiPropertyOptional({ enum: EstadoRuta })
  @IsOptional()
  @IsEnum(EstadoRuta)
  estado?: EstadoRuta;
}
