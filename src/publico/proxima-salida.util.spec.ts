import {
  buscarProximaSalida,
  buscarProximoPaso,
  formatoHoraMinutos,
  interpretarMomento,
  isoBogota,
  momentoEnBogota,
  tipoDiaPara,
} from './proxima-salida.util.js';
import { TipoDia } from '../common/enums.js';

describe('momentoEnBogota', () => {
  it('convierte UTC a hora de Montería (UTC-5)', () => {
    // 27 oct 2026 10:15 UTC = 05:15 en Montería, martes
    const m = momentoEnBogota(new Date('2026-10-27T10:15:00Z'));
    expect(m).toEqual({ fecha: '2026-10-27', hora: '05:15', minutos: 315, diaSemana: 2 });
  });

  it('cambia de día correctamente cerca de la medianoche', () => {
    // 28 oct 2026 03:30 UTC = 27 oct 22:30 en Montería
    const m = momentoEnBogota(new Date('2026-10-28T03:30:00Z'));
    expect(m.fecha).toBe('2026-10-27');
    expect(m.hora).toBe('22:30');
  });
});

describe('tipoDiaPara', () => {
  it('lunes a viernes es laboral', () => {
    for (const d of [1, 2, 3, 4, 5]) expect(tipoDiaPara(d, false)).toBe(TipoDia.LABORAL);
  });
  it('sábado es sábado', () => {
    expect(tipoDiaPara(6, false)).toBe(TipoDia.SABADO);
  });
  it('domingo es domingo/festivo', () => {
    expect(tipoDiaPara(0, false)).toBe(TipoDia.DOMINGO_FESTIVO);
  });
  it('un festivo entre semana usa el horario de domingo/festivo', () => {
    expect(tipoDiaPara(1, true)).toBe(TipoDia.DOMINGO_FESTIVO);
  });
  it('un sábado festivo usa el horario de domingo/festivo', () => {
    expect(tipoDiaPara(6, true)).toBe(TipoDia.DOMINGO_FESTIVO);
  });
});

describe('buscarProximaSalida', () => {
  const horas = ['05:30', '06:00', '06:30', '18:00'];

  it('devuelve la siguiente salida y los minutos que faltan', () => {
    expect(buscarProximaSalida(horas, 5 * 60 + 40)).toEqual({ hora: '06:00', minutosRestantes: 20 });
  });
  it('antes de la primera salida devuelve la primera', () => {
    expect(buscarProximaSalida(horas, 4 * 60)).toEqual({ hora: '05:30', minutosRestantes: 90 });
  });
  it('si sale en este mismo minuto, faltan 0 minutos', () => {
    expect(buscarProximaSalida(horas, 6 * 60 + 30)).toEqual({ hora: '06:30', minutosRestantes: 0 });
  });
  it('después de la última salida devuelve null', () => {
    expect(buscarProximaSalida(horas, 18 * 60 + 1)).toBeNull();
  });
  it('sin horarios devuelve null', () => {
    expect(buscarProximaSalida([], 600)).toBeNull();
  });
});

describe('buscarProximoPaso (embarcadero intermedio y medianoche)', () => {
  const salidas = ['06:00', '06:30'];

  it('embarcadero intermedio: salida del origen + minutos desde el origen', () => {
    // A 21 min del origen: pasos a las 06:21 y 06:51
    expect(buscarProximoPaso(salidas, [], 21, 6 * 60 + 10)).toMatchObject({
      salidaOrigen: '06:00',
      horaPaso: '06:21',
      minutosRestantes: 11,
    });
  });
  it('justo a la hora de paso: faltan 0 minutos', () => {
    expect(buscarProximoPaso(salidas, [], 21, 6 * 60 + 21)?.minutosRestantes).toBe(0);
  });
  it('ya pasó la salida del origen, pero la embarcación aún no llega al intermedio', () => {
    // 06:35: ya salió la de 06:30 del origen, y pasa por el intermedio a las 06:51
    expect(buscarProximoPaso(salidas, [], 21, 6 * 60 + 35)).toMatchObject({
      salidaOrigen: '06:30',
      horaPaso: '06:51',
    });
  });
  it('después del último paso devuelve null', () => {
    expect(buscarProximoPaso(salidas, [], 21, 6 * 60 + 52)).toBeNull();
  });
  it('medianoche: zarpa 23:50 y pasa por el embarcadero a las 00:20', () => {
    expect(buscarProximoPaso(['23:50'], [], 30, 23 * 60 + 55)).toMatchObject({
      horaPaso: '00:20',
      minutosRestantes: 25,
      pasaDespuesDeMedianoche: true,
      salidaDelDiaAnterior: false,
    });
  });
  it('madrugada: a las 00:05 el próximo paso viene de la salida de ayer a las 23:50', () => {
    expect(buscarProximoPaso(['05:30'], ['23:50'], 30, 5)).toMatchObject({
      salidaOrigen: '23:50',
      horaPaso: '00:20',
      minutosRestantes: 15,
      salidaDelDiaAnterior: true,
    });
  });
  it('las salidas de ayer que ya pasaron no cuentan', () => {
    // Ayer 22:00 + 30 = 22:30 de ayer: a las 00:05 ya no aplica
    expect(buscarProximoPaso(['05:30'], ['22:00'], 30, 5)?.salidaOrigen).toBe('05:30');
  });
});

describe('formatoHoraMinutos', () => {
  it('da la vuelta después de medianoche', () => {
    expect(formatoHoraMinutos(1460)).toBe('00:20');
    expect(formatoHoraMinutos(6 * 60 + 21)).toBe('06:21');
  });
});

describe('isoBogota e interpretarMomento', () => {
  it('formatea con la zona -05:00', () => {
    expect(isoBogota(new Date('2026-10-01T19:30:00Z'))).toBe('2026-10-01T14:30:00-05:00');
  });
  it('una hora sin zona se interpreta como hora de Montería', () => {
    expect(interpretarMomento('2026-10-27T05:00').toISOString()).toBe('2026-10-27T10:00:00.000Z');
  });
  it('una hora con zona se respeta', () => {
    expect(interpretarMomento('2026-10-27T05:00:00Z').toISOString()).toBe('2026-10-27T05:00:00.000Z');
  });
});
