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
    tipo: e.tipo,
    margen: e.margen,
    estado: e.estado,
    tieneRampa: e.tieneRampa,
    tieneTecho: e.tieneTecho,
    tieneIluminacion: e.tieneIluminacion,
    fotoUrl: e.fotoUrl,
    esOficial: e.esOficial,
    creadoEn: e.creadoEn,
    actualizadoEn: e.actualizadoEn,
  };
}
