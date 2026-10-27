import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsString, Length, ValidateNested } from 'class-validator';
import { TrazadoDto } from './trazado.dto.js';

export class GuardarSentidoDto {
  @ApiProperty({ example: 'Centro (Calle 30)', description: 'Hacia dónde va este sentido' })
  @IsString()
  @Length(2, 120)
  destino: string;

  @ApiPropertyOptional({ type: TrazadoDto, description: 'Opcional: también se puede enviar después' })
  @IsOptional()
  @ValidateNested()
  @Type(() => TrazadoDto)
  trazado?: TrazadoDto;
}
