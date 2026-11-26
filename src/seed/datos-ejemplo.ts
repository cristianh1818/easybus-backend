// ============================================================================
//  DATOS DE EJEMPLO — NO OFICIALES
//  Nombres, coordenadas, recorridos y horarios son APROXIMADOS e inventados
//  para la demostración. No provienen del operador del Businú y deben
//  validarse en campo antes de usarse con usuarios reales.
// ============================================================================

import { Margen, Sentido, TipoDia } from '../common/enums.js';

export const AVISO_NO_OFICIAL =
  'DATO DE EJEMPLO NO OFICIAL (pendiente de validación en campo).';

// Embarcaderos sobre el río Sinú en Montería, de sur a norte (orden de la ida).
// Coordenadas aproximadas (WGS 84). Accesibilidad: null = sin dato.
// Las fotos no van en el seed: los archivos de /uploads no están en Git.
export const EMBARCADEROS = [
  {
    clave: 'SIERRA_CHIQUITA',
    nombre: 'Embarcadero Sierra Chiquita',
    referencia: 'Cerca de Sierra Chiquita',
    latitud: 8.726846,
    longitud: -75.922647,
    margen: null,
    tieneRampa: true,
    tieneTecho: true,
    tieneIluminacion: true,
  },
  {
    clave: 'BATALLON',
    nombre: 'Embarcadero Batallón',
    referencia: 'Batallón de Infantería',
    latitud: 8.740104,
    longitud: -75.907617,
    margen: null,
    tieneRampa: true,
    tieneTecho: true,
    tieneIluminacion: true,
  },
  {
    clave: 'SUR',
    nombre: 'Embarcadero Sur',
    referencia: 'Ronda del Sinú, sector sur (zona del mercado)',
    latitud: 8.749478,
    longitud: -75.900891,
    margen: null,
    tieneRampa: true,
    tieneTecho: null,
    tieneIluminacion: true,
  },
  {
    clave: 'PUENTE_METALICO',
    nombre: 'Embarcadero Puente Metálico',
    referencia: 'cerca del Puente metálico',
    latitud: 8.749219,
    longitud: -75.891922,
    margen: Margen.IZQUIERDA,
    tieneRampa: true,
    tieneTecho: null,
    tieneIluminacion: true,
  },
  {
    clave: 'AVENIDA_PRIMERA',
    nombre: 'Embarcadero Avenida primera',
    referencia: 'Avenida primera entre 25 y 28',
    latitud: 8.756435,
    longitud: -75.889807,
    margen: Margen.DERECHA,
    tieneRampa: true,
    tieneTecho: true,
    tieneIluminacion: true,
  },
  {
    clave: 'MARIA_VARILLA',
    nombre: 'Embarcadero María Varilla',
    referencia: 'Plaza cultural María Varilla',
    latitud: 8.762391,
    longitud: -75.884495,
    margen: Margen.DERECHA,
    tieneRampa: true,
    tieneTecho: true,
    tieneIluminacion: true,
  },
  {
    clave: 'SUCRE',
    nombre: 'Embarcadero Sucre',
    referencia: 'Barrio sucre',
    latitud: 8.771491,
    longitud: -75.880761,
    margen: null,
    tieneRampa: null,
    tieneTecho: true,
    tieneIluminacion: null,
  },
  {
    clave: 'RONDA_NORTE',
    nombre: 'Embarcadero Ronda Norte',
    referencia: 'Parque Ronda norte',
    latitud: 8.772636,
    longitud: -75.869818,
    margen: null,
    tieneRampa: true,
    tieneTecho: null,
    tieneIluminacion: null,
  },
  {
    clave: 'CLUB_CAMPESTRE',
    nombre: 'Embarcadero Club campestre',
    referencia: 'Club campestre',
    latitud: 8.783056,
    longitud: -75.873017,
    margen: null,
    tieneRampa: true,
    tieneTecho: null,
    tieneIluminacion: true,
  },
  {
    clave: 'UNIVERSIDAD',
    nombre: 'Embarcadero Universidad de Córdoba',
    referencia: 'Entrada trasera de la universidad de Córdoba',
    latitud: 8.79241,
    longitud: -75.86484,
    margen: null,
    tieneRampa: true,
    tieneTecho: true,
    tieneIluminacion: true,
  },
  {
    clave: 'BOCA_CEIBA',
    nombre: 'Embarcadero Boca de la Ceiba',
    referencia: 'Boca de la ceiba',
    latitud: 8.827637,
    longitud: -75.856895,
    margen: Margen.IZQUIERDA,
    tieneRampa: true,
    tieneTecho: null,
    tieneIluminacion: true,
  },
] as const;

export type ClaveEmbarcadero = (typeof EMBARCADEROS)[number]['clave'];

// Genera horas cada N minutos entre dos horas (incluidas), ej. cada('05:30','07:00',30)
export function cada(desde: string, hasta: string, minutos: number): string[] {
  const aMin = (h: string) =>
    Number(h.slice(0, 2)) * 60 + Number(h.slice(3, 5));
  const horas: string[] = [];
  for (let m = aMin(desde); m <= aMin(hasta); m += minutos) {
    horas.push(
      `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`,
    );
  }
  return horas;
}

interface SentidoEjemplo {
  sentido: Sentido;
  destino: string;
  embarcaderos: ClaveEmbarcadero[]; // en orden de recorrido
  trazado: [number, number][]; // [longitud, latitud]
  horarios: Record<TipoDia, string[]>;
}

interface RutaEjemplo {
  codigo: string;
  nombre: string;
  descripcion: string;
  color: string;
  sentidos: SentidoEjemplo[];
}

// Cauce del río dibujado en el panel (68 puntos), de Sierra Chiquita (sur) a
// Boca de la Ceiba (norte). La vuelta es el mismo cauce al revés.
const CAUCE_SUR_NORTE: [number, number][] = [
  [-75.922647, 8.726846],
  [-75.922866, 8.733205],
  [-75.92205, 8.73664],
  [-75.920291, 8.739228],
  [-75.918145, 8.739779],
  [-75.916364, 8.739949],
  [-75.914347, 8.739779],
  [-75.912673, 8.739016],
  [-75.911322, 8.738104],
  [-75.91012, 8.737786],
  [-75.908875, 8.738507],
  [-75.907617, 8.740104],
  [-75.906279, 8.741518],
  [-75.905399, 8.743767],
  [-75.903897, 8.746714],
  [-75.90276, 8.748305],
  [-75.900891, 8.749478],
  [-75.898232, 8.749132],
  [-75.896173, 8.74839],
  [-75.893984, 8.747711],
  [-75.893276, 8.74752],
  [-75.892653, 8.747669],
  [-75.892053, 8.748305],
  [-75.891922, 8.749219],
  [-75.89201, 8.750999],
  [-75.891838, 8.75278],
  [-75.891109, 8.754667],
  [-75.889807, 8.756435],
  [-75.884495, 8.762391],
  [-75.884049, 8.764677],
  [-75.883276, 8.766904],
  [-75.88244, 8.769428],
  [-75.882075, 8.770827],
  [-75.880761, 8.771491],
  [-75.879178, 8.771824],
  [-75.877676, 8.771485],
  [-75.875895, 8.770446],
  [-75.874543, 8.769088],
  [-75.873148, 8.768176],
  [-75.871561, 8.768113],
  [-75.870295, 8.768791],
  [-75.869758, 8.770403],
  [-75.869818, 8.772636],
  [-75.870659, 8.775069],
  [-75.871668, 8.777486],
  [-75.872827, 8.780434],
  [-75.873106, 8.781749],
  [-75.873017, 8.783056],
  [-75.872998, 8.784145],
  [-75.872505, 8.785226],
  [-75.871389, 8.786223],
  [-75.870144, 8.78705],
  [-75.867484, 8.788704],
  [-75.86484, 8.79241],
  [-75.862784, 8.796063],
  [-75.860338, 8.79971],
  [-75.859609, 8.800643],
  [-75.859394, 8.801703],
  [-75.859909, 8.80323],
  [-75.861282, 8.805965],
  [-75.862119, 8.807619],
  [-75.862463, 8.809082],
  [-75.862098, 8.810397],
  [-75.861325, 8.811754],
  [-75.860209, 8.812942],
  [-75.859437, 8.814341],
  [-75.857806, 8.82066],
  [-75.856895, 8.827637],
];

const ORDEN_SUR_NORTE = EMBARCADEROS.map((e) => e.clave);

// Lunes a viernes 05:30–22:00; sábados, domingos y festivos 05:30–19:00; cada 30 min
const HORARIOS: Record<TipoDia, string[]> = {
  [TipoDia.LABORAL]: cada('05:30', '22:00', 30),
  [TipoDia.SABADO]: cada('05:30', '19:00', 30),
  [TipoDia.DOMINGO_FESTIVO]: cada('05:30', '19:00', 30),
};

export const RUTAS: RutaEjemplo[] = [
  {
    codigo: 'BS-1',
    nombre: 'Businú',
    descripcion: `Ruta completa de sierra chiquita a boca de la ceiba. ${AVISO_NO_OFICIAL}`,
    color: '#0f63d2',
    sentidos: [
      {
        sentido: Sentido.IDA,
        destino: 'Embarcadero Boca de la ceiba',
        embarcaderos: [...ORDEN_SUR_NORTE],
        trazado: CAUCE_SUR_NORTE,
        horarios: HORARIOS,
      },
      {
        sentido: Sentido.VUELTA,
        destino: 'Embarcadero Sierra chiquita',
        embarcaderos: [...ORDEN_SUR_NORTE].reverse(),
        trazado: [...CAUCE_SUR_NORTE].reverse(),
        horarios: HORARIOS,
      },
    ],
  },
];

// Embarcaciones del Businú (sin GPS en la beta: solo inventario).
// Son 5 para que cuadre con los horarios: a 20 km/h + 1 min por parada un viaje dura
// unos 60 min; ida, vuelta y unos 10 min de espera ≈ 130 min, y con una salida cada
// 30 min desde cada extremo hacen falta ceil(130 / 30) = 5 embarcaciones.
// La capacidad de BN-05 es de ejemplo (el promedio de las otras cuatro).
export const EMBARCACIONES = [
  { codigo: 'BN-01', nombre: 'Businu 1', capacidad: 39 },
  { codigo: 'BN-02', nombre: 'Businu 2', capacidad: 25 },
  { codigo: 'BN-03', nombre: 'Businu 3', capacidad: 35 },
  { codigo: 'BN-04', nombre: 'Businu 4', capacidad: 40 },
  { codigo: 'BN-05', nombre: 'Businu 5', capacidad: 35 },
];

// Festivos de Colombia 2026 (Ley 51 de 1983 / Ley Emiliani).
// Verificar contra el calendario oficial antes de producción.
export const FESTIVOS_2026 = [
  { fecha: '2026-01-01', nombre: 'Año Nuevo' },
  { fecha: '2026-01-12', nombre: 'Día de los Reyes Magos' },
  { fecha: '2026-03-23', nombre: 'Día de San José' },
  { fecha: '2026-04-02', nombre: 'Jueves Santo' },
  { fecha: '2026-04-03', nombre: 'Viernes Santo' },
  { fecha: '2026-05-01', nombre: 'Día del Trabajo' },
  { fecha: '2026-05-18', nombre: 'Ascensión del Señor' },
  { fecha: '2026-06-08', nombre: 'Corpus Christi' },
  { fecha: '2026-06-15', nombre: 'Sagrado Corazón de Jesús' },
  { fecha: '2026-06-29', nombre: 'San Pedro y San Pablo' },
  { fecha: '2026-07-20', nombre: 'Día de la Independencia' },
  { fecha: '2026-08-07', nombre: 'Batalla de Boyacá' },
  { fecha: '2026-08-17', nombre: 'Asunción de la Virgen' },
  { fecha: '2026-10-12', nombre: 'Día de la Diversidad Étnica y Cultural' },
  { fecha: '2026-11-02', nombre: 'Día de Todos los Santos' },
  { fecha: '2026-11-16', nombre: 'Independencia de Cartagena' },
  { fecha: '2026-12-08', nombre: 'Día de la Inmaculada Concepción' },
  { fecha: '2026-12-25', nombre: 'Navidad' },
];
