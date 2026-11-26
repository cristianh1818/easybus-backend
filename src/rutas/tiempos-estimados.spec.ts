import { calcularMinutos, type ParadaParaEstimar } from './tiempos-estimados.js';

// Tramos reales de BS-1 (ida, Sierra Chiquita → Boca de la Ceiba), en metros
const TRAMOS = [3005, 1306, 1138, 861, 881, 1134, 1738, 1218, 1429, 4265];

const paradas = (reales: Record<number, number> = {}): ParadaParaEstimar[] => {
  let acumulado = 0;
  return [0, ...TRAMOS].map((m, i) => {
    acumulado += m;
    return {
      tiempoEstimado: reales[i] === undefined,
      minutosActuales: reales[i] ?? 0,
      acumuladoM: acumulado,
    };
  });
};

describe('calcularMinutos (20 km/h + 1 min por parada intermedia)', () => {
  it('da la tabla de BS-1: 60 min de Sierra Chiquita a Boca de la Ceiba', () => {
    expect(calcularMinutos(paradas())).toEqual([0, 10, 15, 19, 23, 27, 31, 37, 42, 47, 60]);
  });

  it('un tiempo real se respeta y los siguientes parten de él', () => {
    // Medido: sale del Embarcadero Sur (parada 3) a los 20 min
    const minutos = calcularMinutos(paradas({ 2: 20 }));
    expect(minutos.slice(0, 4)).toEqual([0, 10, 20, 24]); // 1138 m ≈ 3,4 min + 1 parada
    expect(minutos.at(-1)).toBe(65);
  });
});
