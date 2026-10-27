import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayUnique, IsArray, IsEnum, IsOptional, Matches } from 'class-validator';
import { TipoDia } from '../../common/enums.js';

// Hora en formato 24 h "HH:MM" (ej. 05:30, 18:45)
export const HORA_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;
const HORA_MSG = 'La hora debe tener el formato HH:MM de 24 horas (ej. 06:30)';

export class CrearHorarioDto {
  @ApiProperty({ enum: TipoDia, example: TipoDia.LABORAL })
  @IsEnum(TipoDia)
  tipoDia: TipoDia;

  @ApiProperty({ example: '06:30' })
  @Matches(HORA_REGEX, { message: HORA_MSG })
  horaSalida: string;
}

export class ActualizarHorarioDto {
  @ApiPropertyOptional({ enum: TipoDia })
  @IsOptional()
  @IsEnum(TipoDia)
  tipoDia?: TipoDia;

  @ApiPropertyOptional({ example: '06:45' })
  @IsOptional()
  @Matches(HORA_REGEX, { message: HORA_MSG })
  horaSalida?: string;
}

export class ReemplazarHorariosDto {
  @ApiProperty({
    description: 'Todas las horas de salida de ese sentido y tipo de día. Reemplaza las anteriores.',
    example: ['05:30', '06:00', '06:30', '07:00', '12:00', '17:30', '18:00'],
    type: [String],
  })
  @IsArray()
  @ArrayUnique({ message: 'Hay horas repetidas' })
  @Matches(HORA_REGEX, { each: true, message: HORA_MSG })
  horas: string[];
}

export class FiltroHorariosDto {
  @ApiPropertyOptional({ enum: TipoDia })
  @IsOptional()
  @IsEnum(TipoDia)
  tipoDia?: TipoDia;
}
