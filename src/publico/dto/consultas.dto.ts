import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsISO8601, IsOptional, IsUUID } from 'class-validator';
import { Sentido, TipoDia } from '../../common/enums.js';

export class ConsultaSentidoDto {
  @ApiProperty({ enum: Sentido, example: Sentido.IDA })
  @IsEnum(Sentido, { message: 'sentido debe ser "ida" o "vuelta"' })
  sentido: Sentido;
}

export class ConsultaHorariosDto extends ConsultaSentidoDto {
  @ApiPropertyOptional({ enum: TipoDia, description: 'Si no se envía, devuelve todos los tipos de día' })
  @IsOptional()
  @IsEnum(TipoDia)
  tipoDia?: TipoDia;
}

export class ConsultaProximaSalidaDto extends ConsultaSentidoDto {
  @ApiPropertyOptional({
    example: '2026-10-27T05:40',
    description:
      'Solo para pruebas y demo: simula otra fecha/hora. Sin zona se toma como hora de Montería. ' +
      'Si no se envía se usa la hora actual.',
  })
  @IsOptional()
  @IsISO8601({}, { message: 'momento debe ser una fecha/hora ISO, ej. 2026-10-27T05:40' })
  momento?: string;

  @ApiPropertyOptional({
    description:
      'Id del embarcadero desde el que se consulta. Hora de paso = salida del origen + minutos desde el origen. ' +
      'Si no se envía, se usa el primer embarcadero del sentido.',
  })
  @IsOptional()
  @IsUUID('all', { message: 'desde debe ser el id (UUID) de un embarcadero' })
  desde?: string;
}
