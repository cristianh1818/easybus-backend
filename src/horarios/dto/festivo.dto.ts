import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsISO8601, IsOptional, IsString, Length, Max, Min } from 'class-validator';

export class CrearFestivoDto {
  @ApiProperty({ example: '2026-11-02', description: 'Fecha en formato AAAA-MM-DD' })
  @IsISO8601({ strict: true }, { message: 'fecha debe tener el formato AAAA-MM-DD' })
  @Length(10, 10, { message: 'fecha debe tener el formato AAAA-MM-DD' })
  fecha: string;

  @ApiProperty({ example: 'Día de Todos los Santos' })
  @IsString()
  @Length(2, 120)
  nombre: string;
}

export class FiltroFestivosDto {
  @ApiPropertyOptional({ example: 2026 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  anio?: number;
}
