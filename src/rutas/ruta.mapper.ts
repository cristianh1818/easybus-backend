import { Ruta } from './entities/ruta.entity.js';
import { RutaSentido } from './entities/ruta-sentido.entity.js';
import { formatearEmbarcadero } from '../embarcaderos/embarcadero.mapper.js';

// Resumen para listados: datos de la ruta y sus sentidos sin geometrías
export function formatearRutaResumen(r: Ruta) {
  return {
    id: r.id,
    codigo: r.codigo,
    nombre: r.nombre,
    descripcion: r.descripcion,
    color: r.color,
    estado: r.estado,
    esOficial: r.esOficial,
    sentidos: (r.sentidos ?? []).map((s) => ({
      id: s.id,
      sentido: s.sentido,
      destino: s.destino,
    })),
    actualizadoEn: r.actualizadoEn,
  };
}

export function formatearSentido(s: RutaSentido) {
  return {
    id: s.id,
    sentido: s.sentido,
    destino: s.destino,
    trazado: s.trazado,
    embarcaderos: (s.embarcaderos ?? []).map((re) => ({
      orden: re.orden,
      ...formatearEmbarcadero(re.embarcadero),
    })),
    actualizadoEn: s.actualizadoEn,
  };
}

// Detalle completo: sentidos con trazado (GeoJSON) y embarcaderos en orden
export function formatearRutaDetalle(r: Ruta) {
  return {
    ...formatearRutaResumen(r),
    sentidos: (r.sentidos ?? []).map(formatearSentido),
    creadoEn: r.creadoEn,
  };
}
