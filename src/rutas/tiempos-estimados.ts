// Estimación de minutos_desde_origen de cada embarcadero de un sentido.
//
// Regla B (decisión del proyecto):
//   - Velocidad estimada: 20 km/h (3 minutos por km) MÁS 1 minuto por cada parada
//     intermedia (subir y bajar pasajeros). ESTIMACIÓN pendiente de medir en un viaje
//     real (2026-11-26); antes era 10 min/km, que no cuadraba con la flota.
//   - En una parada intermedia el tiempo incluye su propio minuto: es la hora en que la
//     embarcación SALE de ahí (lo que le sirve al pasajero que espera). En el destino
//     final no se suma: es la hora de llegada.
//   - Cada tramo entre embarcaderos consecutivos mide lo MAYOR entre:
//       · la distancia a lo largo del trazado (ST_LineLocatePoint + ST_LineSubstring + ST_Length en geography)
//       · la distancia en línea recta (ST_Distance en geography)
//     Así un tramo nunca es más corto que la línea recta, aunque el trazado no pase por el embarcadero.
//     Si el sentido no tiene trazado, se usa solo la línea recta.
//   - El primer embarcadero siempre queda en 0.
//   - Solo se recalculan las filas con tiempo_estimado = true. Una fila con tiempo real
//     (tiempo_estimado = false) no se toca y sirve de punto de partida para las estimadas siguientes
//     (se toma como la hora de salida de ese embarcadero).

import { EntityManager } from 'typeorm';

export const VELOCIDAD_KMH = 20;
export const METROS_POR_MINUTO = (VELOCIDAD_KMH * 1000) / 60; // ≈ 333 m por minuto
export const MINUTOS_POR_PARADA = 1;
export const UMBRAL_LEJOS_DEL_TRAZADO_M = 150;

export interface ParadaParaEstimar {
  tiempoEstimado: boolean;
  minutosActuales: number;
  /** Metros recorridos desde el origen hasta esta parada (regla B). */
  acumuladoM: number;
}

// Minutos desde el origen de cada parada de la secuencia (en orden). Las filas con
// tiempo real devuelven su mismo valor. Sin base de datos: se puede probar sola.
export function calcularMinutos(paradas: ParadaParaEstimar[]): number[] {
  let anclaMinutos = 0;
  let anclaMetros = 0;
  let paradasDesdeAncla = 0;
  const ultima = paradas.length - 1;

  return paradas.map((p, i) => {
    if (i === 0) return 0; // el origen siempre es 0, sea estimado o real
    if (i < ultima) paradasDesdeAncla++; // minuto de parada (no en el destino final)
    if (!p.tiempoEstimado) {
      // Tiempo real: se respeta y las estimaciones siguientes parten de él
      anclaMinutos = p.minutosActuales;
      anclaMetros = p.acumuladoM;
      paradasDesdeAncla = 0;
      return p.minutosActuales;
    }
    return (
      anclaMinutos +
      Math.round((p.acumuladoM - anclaMetros) / METROS_POR_MINUTO + paradasDesdeAncla * MINUTOS_POR_PARADA)
    );
  });
}

interface FilaDistancia {
  embarcadero_id: string;
  orden: number;
  minutos_desde_origen: number;
  tiempo_estimado: boolean;
  acumulado_m: number;
}

const SQL_DISTANCIAS = `
  WITH base AS (
    SELECT re.embarcadero_id, re.orden, re.minutos_desde_origen, re.tiempo_estimado, e.ubicacion,
           CASE WHEN rs.trazado IS NOT NULL THEN
             ST_Length(ST_LineSubstring(rs.trazado, 0, ST_LineLocatePoint(rs.trazado, e.ubicacion))::geography)
           END AS m_sobre_trazado
    FROM ruta_embarcaderos re
    JOIN ruta_sentidos rs ON rs.id = re.ruta_sentido_id
    JOIN embarcaderos e ON e.id = re.embarcadero_id
    WHERE re.ruta_sentido_id = $1
  ),
  tramos AS (
    SELECT *,
           -- greatest() ignora los NULL: sin trazado queda solo la línea recta; en el primero, 0
           COALESCE(greatest(
             abs(m_sobre_trazado - lag(m_sobre_trazado) OVER w),
             ST_Distance(ubicacion::geography, (lag(ubicacion) OVER w)::geography)
           ), 0) AS tramo_m
    FROM base
    WINDOW w AS (ORDER BY orden)
  )
  SELECT embarcadero_id, orden, minutos_desde_origen, tiempo_estimado,
         sum(tramo_m) OVER (ORDER BY orden) AS acumulado_m
  FROM tramos
  ORDER BY orden`;

// Recalcula y guarda los minutos estimados de un sentido. Devuelve cuántas filas cambiaron.
export async function recalcularTiemposEstimados(
  manager: EntityManager,
  rutaSentidoId: string,
): Promise<number> {
  const filas = await manager.query<FilaDistancia[]>(SQL_DISTANCIAS, [rutaSentidoId]);

  const minutosNuevos = calcularMinutos(
    filas.map((f) => ({
      tiempoEstimado: f.tiempo_estimado,
      minutosActuales: f.minutos_desde_origen,
      acumuladoM: Number(f.acumulado_m),
    })),
  );
  let cambios = 0;

  for (const [i, f] of filas.entries()) {
    const minutos = minutosNuevos[i];
    if (minutos !== f.minutos_desde_origen) {
      await manager.query(
        `UPDATE ruta_embarcaderos SET minutos_desde_origen = $1
         WHERE ruta_sentido_id = $2 AND embarcadero_id = $3`,
        [minutos, rutaSentidoId, f.embarcadero_id],
      );
      cambios++;
    }
  }
  return cambios;
}

// Distancia (m) de cada embarcadero de la secuencia al trazado de su sentido.
// Clave: "rutaSentidoId:embarcaderoId". Sin trazado, el sentido no aparece.
export async function distanciasAlTrazado(
  manager: EntityManager,
  rutaSentidoIds: string[],
): Promise<Map<string, number>> {
  if (rutaSentidoIds.length === 0) return new Map();
  const filas = await manager.query<{ ruta_sentido_id: string; embarcadero_id: string; metros: number }[]>(
    `SELECT re.ruta_sentido_id, re.embarcadero_id,
            ST_Distance(rs.trazado::geography, e.ubicacion::geography) AS metros
     FROM ruta_embarcaderos re
     JOIN ruta_sentidos rs ON rs.id = re.ruta_sentido_id
     JOIN embarcaderos e ON e.id = re.embarcadero_id
     WHERE re.ruta_sentido_id = ANY($1::uuid[]) AND rs.trazado IS NOT NULL`,
    [rutaSentidoIds],
  );
  return new Map(filas.map((f) => [`${f.ruta_sentido_id}:${f.embarcadero_id}`, Number(f.metros)]));
}
