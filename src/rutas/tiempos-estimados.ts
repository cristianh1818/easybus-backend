// Estimación de minutos_desde_origen de cada embarcadero de un sentido.
//
// Regla B (decisión del proyecto):
//   - Velocidad estimada: 10 minutos por km (1 minuto cada 100 m).
//   - Cada tramo entre embarcaderos consecutivos mide lo MAYOR entre:
//       · la distancia a lo largo del trazado (ST_LineLocatePoint + ST_LineSubstring + ST_Length en geography)
//       · la distancia en línea recta (ST_Distance en geography)
//     Así un tramo nunca es más corto que la línea recta, aunque el trazado no pase por el embarcadero.
//     Si el sentido no tiene trazado, se usa solo la línea recta.
//   - El primer embarcadero siempre queda en 0.
//   - Solo se recalculan las filas con tiempo_estimado = true. Una fila con tiempo real
//     (tiempo_estimado = false) no se toca y sirve de punto de partida para las estimadas siguientes.

import { EntityManager } from 'typeorm';

export const METROS_POR_MINUTO = 100; // 10 min/km
export const UMBRAL_LEJOS_DEL_TRAZADO_M = 150;

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

  let anclaMinutos = 0;
  let anclaMetros = 0;
  let cambios = 0;

  for (const [i, f] of filas.entries()) {
    const metros = Number(f.acumulado_m);
    let minutos: number;

    if (i === 0) {
      minutos = 0; // el origen siempre es 0, sea estimado o real
    } else if (!f.tiempo_estimado) {
      // Tiempo real: se respeta y las estimaciones siguientes parten de él
      anclaMinutos = f.minutos_desde_origen;
      anclaMetros = metros;
      continue;
    } else {
      minutos = anclaMinutos + Math.round((metros - anclaMetros) / METROS_POR_MINUTO);
    }

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
