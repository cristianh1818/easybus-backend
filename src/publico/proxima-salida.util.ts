import { TipoDia } from '../common/enums.js';

export const ZONA_HORARIA = 'America/Bogota';

export interface MomentoLocal {
  fecha: string; // AAAA-MM-DD en Montería
  hora: string; // HH:MM en Montería
  minutos: number; // minutos desde la medianoche (0 - 1439)
  diaSemana: number; // 0 = domingo ... 6 = sábado
}

const formateador = new Intl.DateTimeFormat('en-US', {
  timeZone: ZONA_HORARIA,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  weekday: 'short',
  hourCycle: 'h23',
});

const DIAS: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

// Convierte un instante (Date) a la fecha y hora LOCALES de Montería,
// sin importar la zona horaria del servidor donde corra la API.
export function momentoEnBogota(instante: Date): MomentoLocal {
  const p = Object.fromEntries(
    formateador.formatToParts(instante).map((x) => [x.type, x.value]),
  ) as Record<string, string>;
  const h = Number(p.hour);
  const m = Number(p.minute);
  return {
    fecha: `${p.year}-${p.month}-${p.day}`,
    hora: `${p.hour}:${p.minute}`,
    minutos: h * 60 + m,
    diaSemana: DIAS[p.weekday],
  };
}

// Regla del documento (sección 8.3): festivo o domingo -> domingo/festivo;
// sábado -> sábado; cualquier otro día -> laboral.
export function tipoDiaPara(diaSemana: number, esFestivo: boolean): TipoDia {
  if (esFestivo || diaSemana === 0) return TipoDia.DOMINGO_FESTIVO;
  if (diaSemana === 6) return TipoDia.SABADO;
  return TipoDia.LABORAL;
}

const aMinutos = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

// Primera hora de la lista que sea igual o posterior al momento actual.
// Una salida "en este mismo minuto" todavía se muestra (0 minutos restantes).
export function buscarProximaSalida(
  horasOrdenadas: string[],
  minutosAhora: number,
): { hora: string; minutosRestantes: number } | null {
  for (const hora of horasOrdenadas) {
    const diferencia = aMinutos(hora) - minutosAhora;
    if (diferencia >= 0) return { hora, minutosRestantes: diferencia };
  }
  return null;
}

// Colombia no tiene horario de verano: siempre es UTC-5.
export function isoBogota(instante: Date): string {
  const local = new Date(instante.getTime() - 5 * 60 * 60 * 1000);
  return local.toISOString().slice(0, 19) + '-05:00';
}

// Si el usuario escribe una fecha/hora sin zona (ej. 2026-10-27T05:00),
// se interpreta como hora de Montería.
export function interpretarMomento(texto: string): Date {
  const tieneZona = /(Z|[+-]\d{2}:?\d{2})$/i.test(texto);
  const conHora = texto.length === 10 ? `${texto}T00:00` : texto;
  return new Date(tieneZona ? conHora : `${conHora}-05:00`);
}
