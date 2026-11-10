import { Ruta } from './entities/ruta.entity.js';
import { RutaSentido } from './entities/ruta-sentido.entity.js';
import { formatearEmbarcadero } from '../embarcaderos/embarcadero.mapper.js';
import { UMBRAL_LEJOS_DEL_TRAZADO_M } from './tiempos-estimados.js';

// Resumen para listados: datos de la ruta y sus sentidos sin geometrías
export function formatearRutaResumen(r: Ruta) {
  return {
    id: r.id,
    codigo: r.codigo,
    nombre: r.nombre,
    descripcion: r.descripcion,
    color: r.color,
    estado: r.estado,
    modo: r.modo,
    esOficial: r.esOficial,
    sentidos: (r.sentidos ?? []).map((s) => ({
      id: s.id,
      sentido: s.sentido,
      destino: s.destino,
    })),
    actualizadoEn: r.actualizadoEn,
  };
}

// distancias: metros de cada embarcadero al trazado ("rutaSentidoId:embarcaderoId")
export function formatearSentido(s: RutaSentido, distancias = new Map<string, number>()) {
  return {
    id: s.id,
    sentido: s.sentido,
    destino: s.destino,
    trazado: s.trazado,
    embarcaderos: (s.embarcaderos ?? []).map((re) => {
      const metros = distancias.get(`${s.id}:${re.embarcaderoId}`);
      return {
        orden: re.orden,
        minutosDesdeOrigen: re.minutosDesdeOrigen,
        tiempoEstimado: re.tiempoEstimado,
        // null si el sentido no tiene trazado
        distanciaAlTrazadoM: metros === undefined ? null : Math.round(metros),
        lejosDelTrazado: metros !== undefined && metros > UMBRAL_LEJOS_DEL_TRAZADO_M,
        ...formatearEmbarcadero(re.embarcadero),
      };
    }),
    actualizadoEn: s.actualizadoEn,
  };
}

// Detalle completo: sentidos con trazado (GeoJSON) y embarcaderos en orden
export function formatearRutaDetalle(r: Ruta, distancias = new Map<string, number>()) {
  return {
    ...formatearRutaResumen(r),
    sentidos: (r.sentidos ?? []).map((s) => formatearSentido(s, distancias)),
    creadoEn: r.creadoEn,
  };
}
