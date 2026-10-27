import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { IsCoordenadasLinea } from '../../common/validators/coordenadas.validator.js';

// Línea geográfica en formato GeoJSON: lista de puntos [longitud, latitud]
export class TrazadoDto {
  @ApiProperty({ enum: ['LineString'], example: 'LineString' })
  @IsIn(['LineString'], { message: 'type debe ser "LineString"' })
  type: 'LineString';

  @ApiProperty({
    description: 'Puntos [longitud, latitud] en el orden del recorrido (mínimo 2)',
    type: 'array',
    items: { type: 'array', items: { type: 'number' } },
    example: [
      [-75.8806, 8.7712],
      [-75.8829, 8.7621],
      [-75.8851, 8.7535],
    ],
  })
  @IsCoordenadasLinea()
  coordinates: number[][];
}
