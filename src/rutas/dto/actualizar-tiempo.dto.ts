import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';

export class ActualizarTiempoDto {
  @ApiPropertyOptional({
    example: 18,
    description: 'Minutos desde el zarpe en el primer embarcadero. Si se envía sin tiempoEstimado, queda como tiempo real.',
  })
  @IsOptional()
  @IsInt({ message: 'minutosDesdeOrigen debe ser un número entero' })
  @Min(0, { message: 'minutosDesdeOrigen no puede ser negativo' })
  @Max(600, { message: 'minutosDesdeOrigen no puede superar 600 (10 horas)' })
  minutosDesdeOrigen?: number;

  @ApiPropertyOptional({
    description: 'true: estimado por distancia (se recalcula solo) · false: tiempo real medido',
  })
  @IsOptional()
  @IsBoolean()
  tiempoEstimado?: boolean;
}
