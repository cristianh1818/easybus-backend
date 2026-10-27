import { PartialType } from '@nestjs/swagger';
import { CrearEmbarcaderoDto } from './crear-embarcadero.dto.js';

// Igual que crear, pero todos los campos son opcionales (solo se envía lo que cambia)
export class ActualizarEmbarcaderoDto extends PartialType(CrearEmbarcaderoDto) {}
