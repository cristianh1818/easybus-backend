// ============================================================================
//  DATOS DE EJEMPLO — NO OFICIALES
//  Nombres, coordenadas, recorridos y horarios son APROXIMADOS e inventados
//  para la demostración. No provienen del operador del Businú y deben
//  validarse en campo antes de usarse con usuarios reales.
// ============================================================================

import { Sentido, TipoDia } from '../common/enums.js';

export const AVISO_NO_OFICIAL = 'DATO DE EJEMPLO NO OFICIAL (pendiente de validación en campo).';

// Embarcaderos sobre el río Sinú en Montería. Coordenadas aproximadas (WGS 84).
export const EMBARCADEROS = [
  { clave: 'NORTE', nombre: 'Embarcadero Ronda Norte', referencia: 'Ronda del Sinú, sector norte (aprox. Calle 44)', latitud: 8.772, longitud: -75.879 },
  { clave: 'C37', nombre: 'Embarcadero Calle 37', referencia: 'Ronda del Sinú a la altura de la Calle 37', latitud: 8.761, longitud: -75.8815 },
  { clave: 'CENTRO', nombre: 'Embarcadero Centro', referencia: 'Ronda del Sinú, frente al centro (aprox. Calle 30)', latitud: 8.753, longitud: -75.883 },
  { clave: 'PUENTE', nombre: 'Embarcadero Puente', referencia: 'Cerca al puente vehicular sobre el río', latitud: 8.745, longitud: -75.884 },
  { clave: 'SUR', nombre: 'Embarcadero Sur', referencia: 'Ronda del Sinú, sector sur (zona del mercado)', latitud: 8.735, longitud: -75.8862 },
  { clave: 'MARGEN', nombre: 'Embarcadero Margen Izquierda', referencia: 'Orilla occidental del río, frente al centro', latitud: 8.7545, longitud: -75.8868 },
] as const;

export type ClaveEmbarcadero = (typeof EMBARCADEROS)[number]['clave'];

// Genera horas cada N minutos entre dos horas (incluidas), ej. cada('05:30','07:00',30)
export function cada(desde: string, hasta: string, minutos: number): string[] {
  const aMin = (h: string) => Number(h.slice(0, 2)) * 60 + Number(h.slice(3, 5));
  const horas: string[] = [];
  for (let m = aMin(desde); m <= aMin(hasta); m += minutos) {
    horas.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`);
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

// Recorrido aproximado por el cauce del río, de norte a sur
const CAUCE_NORTE_SUR: [number, number][] = [
  [-75.879, 8.772],
  [-75.8805, 8.766],
  [-75.8815, 8.761],
  [-75.8825, 8.7565],
  [-75.883, 8.753],
  [-75.8835, 8.749],
  [-75.884, 8.745],
  [-75.885, 8.74],
  [-75.8862, 8.735],
];

export const RUTAS: RutaEjemplo[] = [
  {
    codigo: 'BS-1',
    nombre: 'Ronda Norte – Sur',
    descripcion: `Recorrido longitudinal por el río Sinú entre el sector norte y el sector sur de la Ronda. ${AVISO_NO_OFICIAL}`,
    color: '#1E88E5',
    sentidos: [
      {
        sentido: Sentido.IDA,
        destino: 'Embarcadero Sur',
        embarcaderos: ['NORTE', 'C37', 'CENTRO', 'PUENTE', 'SUR'],
        trazado: CAUCE_NORTE_SUR,
        horarios: {
          [TipoDia.LABORAL]: cada('05:30', '19:00', 30),
          [TipoDia.SABADO]: cada('06:00', '18:00', 60),
          [TipoDia.DOMINGO_FESTIVO]: cada('07:00', '17:00', 90),
        },
      },
      {
        sentido: Sentido.VUELTA,
        destino: 'Embarcadero Ronda Norte',
        embarcaderos: ['SUR', 'PUENTE', 'CENTRO', 'C37', 'NORTE'],
        trazado: [...CAUCE_NORTE_SUR].reverse(),
        horarios: {
          [TipoDia.LABORAL]: cada('05:45', '19:15', 30),
          [TipoDia.SABADO]: cada('06:30', '18:30', 60),
          [TipoDia.DOMINGO_FESTIVO]: cada('07:30', '17:30', 90),
        },
      },
    ],
  },
  {
    codigo: 'BS-2',
    nombre: 'Cruce Centro – Margen Izquierda',
    descripcion: `Cruce corto del río entre el centro y la orilla occidental. ${AVISO_NO_OFICIAL}`,
    color: '#43A047',
    sentidos: [
      {
        sentido: Sentido.IDA,
        destino: 'Embarcadero Margen Izquierda',
        embarcaderos: ['CENTRO', 'MARGEN'],
        trazado: [
          [-75.883, 8.753],
          [-75.885, 8.7538],
          [-75.8868, 8.7545],
        ],
        horarios: {
          [TipoDia.LABORAL]: cada('06:00', '20:00', 20),
          [TipoDia.SABADO]: cada('06:00', '19:00', 30),
          [TipoDia.DOMINGO_FESTIVO]: cada('07:00', '18:00', 30),
        },
      },
      {
        sentido: Sentido.VUELTA,
        destino: 'Embarcadero Centro',
        embarcaderos: ['MARGEN', 'CENTRO'],
        trazado: [
          [-75.8868, 8.7545],
          [-75.885, 8.7538],
          [-75.883, 8.753],
        ],
        horarios: {
          [TipoDia.LABORAL]: cada('06:10', '20:10', 20),
          [TipoDia.SABADO]: cada('06:15', '19:15', 30),
          [TipoDia.DOMINGO_FESTIVO]: cada('07:15', '18:15', 30),
        },
      },
    ],
  },
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
