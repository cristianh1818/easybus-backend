// Utilidades de mapas con Leaflet + OpenStreetMap, compartidas por varias vistas.
// Leaflet se carga como script global (window.L) desde /panel/vendor/leaflet/leaflet.js

// Centro aproximado de Montería sobre el río Sinú
export const MONTERIA = [8.7545, -75.8835];

export const COLORES = {
  activo: '#07295b',
  inactivo: '#9aa7b6',
  seleccion: '#e53935',
  trazado: '#2a64b8',
};

export function crearMapa(elemento, { zoom = 14 } = {}) {
  const L = window.L;
  if (!L) throw new Error('No se pudo cargar la librería de mapas (Leaflet).');

  const mapa = L.map(elemento, { zoomControl: true }).setView(MONTERIA, zoom);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; colaboradores de <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(mapa);
  return mapa;
}

// Punto circular (no depende de imágenes de íconos)
// interactivo: false -> el clic "atraviesa" el punto y llega al mapa (útil al dibujar trazados)
export function punto(latlng, { color = COLORES.activo, radio = 8, relleno = 0.9, interactivo = true } = {}) {
  return window.L.circleMarker(latlng, {
    radius: radio,
    color: '#ffffff',
    weight: 2,
    fillColor: color,
    fillOpacity: relleno,
    interactive: interactivo,
  });
}

// Punto numerado (para mostrar el orden de los embarcaderos en una ruta)
export function puntoNumerado(latlng, numero, color = COLORES.activo, interactivo = true) {
  return window.L.marker(latlng, {
    interactive: interactivo,
    keyboard: interactivo,
    icon: window.L.divIcon({
      className: 'marcador-numero',
      html: `<span style="background:${color}">${numero}</span>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    }),
  });
}

// GeoJSON usa [longitud, latitud]; Leaflet usa [latitud, longitud]
export const aLatLng = ([lng, lat]) => [lat, lng];
export const aLngLat = ({ lat, lng }) => [redondear(lng), redondear(lat)];
export const redondear = (n) => Math.round(n * 1e6) / 1e6;

// Ajusta la vista para que se vean todos los puntos/capas
export function encuadrar(mapa, capas, zoomMaximo = 16) {
  const grupo = window.L.featureGroup(capas.filter(Boolean));
  if (grupo.getLayers().length > 0) {
    mapa.fitBounds(grupo.getBounds(), { padding: [30, 30], maxZoom: zoomMaximo });
  }
}
