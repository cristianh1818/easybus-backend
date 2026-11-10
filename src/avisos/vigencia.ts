// Reglas de vigencia y prioridad de los avisos (funciones puras, con pruebas unitarias).

import { TipoAviso, VigenciaAviso } from '../common/enums.js';

// Un aviso está vigente desde vigente_desde (incluido) hasta vigente_hasta (excluido).
// Sin vigente_hasta, sigue vigente hasta que se cierre.
export function vigencia(desde: Date, hasta: Date | null, ahora: Date = new Date()): VigenciaAviso {
  if (ahora < desde) return VigenciaAviso.PROGRAMADO;
  if (hasta && ahora >= hasta) return VigenciaAviso.VENCIDO;
  return VigenciaAviso.VIGENTE;
}

// Solo se puede eliminar un aviso que nunca ha estado vigente. Uno vigente o vencido ya fue
// visto por los pasajeros: se cierra para conservar el historial.
export function puedeEliminarse(estado: VigenciaAviso): boolean {
  return estado === VigenciaAviso.PROGRAMADO;
}

// Orden de importancia: una suspensión se muestra antes que un retraso, etc.
export const PRIORIDAD: Record<TipoAviso, number> = {
  [TipoAviso.SUSPENDIDO]: 1,
  [TipoAviso.RETRASO]: 2,
  [TipoAviso.CAMBIO_HORARIO]: 3,
  [TipoAviso.INFORMATIVO]: 4,
};

// Mismo orden expresado en SQL, para ordenar en la base de datos
export const SQL_PRIORIDAD = `CASE a.tipo
  WHEN 'suspendido' THEN 1 WHEN 'retraso' THEN 2 WHEN 'cambio_horario' THEN 3 ELSE 4 END`;

export type Alcance = 'general' | 'ruta' | 'embarcadero' | 'ruta_embarcadero';

export function alcance(rutaId: string | null, embarcaderoId: string | null): Alcance {
  if (rutaId && embarcaderoId) return 'ruta_embarcadero';
  if (rutaId) return 'ruta';
  if (embarcaderoId) return 'embarcadero';
  return 'general';
}
