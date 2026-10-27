import { PartialType } from '@nestjs/swagger';
import { CrearRutaDto } from './crear-ruta.dto.js';

// Todos los campos opcionales. Para activar/desactivar basta con { "estado": "inactiva" }
export class ActualizarRutaDto extends PartialType(CrearRutaDto) {}
