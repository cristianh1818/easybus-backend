import { ApiProperty } from '@nestjs/swagger';
import { ArrayUnique, IsArray, IsUUID } from 'class-validator';

export class AsignarEmbarcaderosDto {
  @ApiProperty({
    description:
      'Ids de los embarcaderos EN ORDEN de recorrido. La posición en la lista define el orden (1, 2, 3...). ' +
      'Reemplaza la secuencia anterior completa.',
    type: [String],
    example: ['uuid-embarcadero-1', 'uuid-embarcadero-2', 'uuid-embarcadero-3'],
  })
  @IsArray()
  @ArrayUnique({ message: 'Un embarcadero no puede repetirse en el mismo sentido' })
  @IsUUID('all', { each: true, message: 'Cada id debe ser un UUID válido' })
  embarcaderoIds: string[];
}
