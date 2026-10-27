import { Embarcadero } from './entities/embarcadero.entity.js';

// Formato de respuesta de un embarcadero: además del punto GeoJSON (para el mapa)
// se entregan latitud y longitud por separado, que son más fáciles de leer.
export function formatearEmbarcadero(e: Embarcadero) {
  const [longitud, latitud] = e.ubicacion.coordinates;
  return {
    id: e.id,
    nombre: e.nombre,
    referencia: e.referencia,
    latitud,
    longitud,
    ubicacion: e.ubicacion,
    activo: e.activo,
    esOficial: e.esOficial,
    creadoEn: e.creadoEn,
    actualizadoEn: e.actualizadoEn,
  };
}
