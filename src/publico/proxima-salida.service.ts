import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Horario } from '../horarios/entities/horario.entity.js';
import { RutaEmbarcadero } from '../rutas/entities/ruta-embarcadero.entity.js';
import { RutasService } from '../rutas/rutas.service.js';
import { FestivosService } from '../horarios/festivos.service.js';
import { formatoHora } from '../horarios/horarios.service.js';
import { AvisosService } from '../avisos/avisos.service.js';
import { EstadoEmbarcadero, EstadoRuta, Sentido, TipoAviso, TipoDia } from '../common/enums.js';
import {
  buscarProximoPaso,
  isoBogota,
  momentoEnBogota,
  sumarMinutos,
  tipoDiaPara,
} from './proxima-salida.util.js';

// Nombres del tipo de día en la respuesta, como en el ejemplo del documento (sección 9.2)
const DAY_TYPE: Record<TipoDia, string> = {
  [TipoDia.LABORAL]: 'WEEKDAY',
  [TipoDia.SABADO]: 'SATURDAY',
  [TipoDia.DOMINGO_FESTIVO]: 'SUNDAY_HOLIDAY',
};

const AVISO =
  'Hora estimada según el horario programado. No corresponde a la ubicación real de la embarcación.';

const UN_DIA_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class ProximaSalidaService {
  constructor(
    @InjectRepository(Horario) private readonly horarios: Repository<Horario>,
    @InjectRepository(RutaEmbarcadero) private readonly secuencias: Repository<RutaEmbarcadero>,
    private readonly rutas: RutasService,
    private readonly festivos: FestivosService,
    private readonly avisos: AvisosService,
  ) {}

  // Sección 8.3 + avisos de servicio. "desdeId" = embarcadero desde el que se consulta
  // (por defecto, el primero del sentido). Orden de decisión:
  //   1. Ruta inactiva                        -> OUT_OF_SERVICE
  //   2. Aviso SUSPENDIDO vigente que aplique -> SUSPENDED (con el motivo)
  //   3. Embarcadero cerrado temporalmente    -> OUT_OF_SERVICE
  //   4. Horario                              -> NEXT_DEPARTURE o NO_MORE_DEPARTURES_TODAY
  // En todos los casos "alerts" trae los avisos vigentes que afectan a la ruta o al embarcadero.
  async calcular(rutaId: string, sentido: Sentido, instante: Date = new Date(), desdeId?: string) {
    const ruta = await this.rutas.buscarRuta(rutaId);
    const rs = await this.rutas.obtenerSentido(rutaId, sentido);

    const secuencia = await this.secuencias.find({
      where: { rutaSentidoId: rs.id },
      relations: { embarcadero: true },
      order: { orden: 'ASC' },
    });
    let parada: RutaEmbarcadero | null = secuencia[0] ?? null;
    if (desdeId) {
      parada = secuencia.find((p) => p.embarcaderoId === desdeId) ?? null;
      if (!parada) {
        throw new BadRequestException({
          code: 'EMBARCADERO_FUERA_DE_RUTA',
          message: `Ese embarcadero no está en el sentido ${sentido} de la ruta ${ruta.codigo}`,
        });
      }
    }
    const desfase = parada?.minutosDesdeOrigen ?? 0;

    const ahora = momentoEnBogota(instante);
    const tipoDia = await this.tipoDiaDe(ahora.fecha, ahora.diaSemana);
    const avisos = await this.avisos.vigentes(
      { rutaId, embarcaderoId: parada?.embarcaderoId },
      instante,
    );

    const base = {
      route: { id: ruta.id, code: ruta.codigo, name: ruta.nombre },
      direction: sentido,
      destination: rs.destino,
      fromStop: parada
        ? {
            id: parada.embarcaderoId,
            name: parada.embarcadero.nombre,
            order: parada.orden,
            isOrigin: parada.orden === 1,
            minutesFromOrigin: desfase,
            isEstimatedTime: parada.tiempoEstimado,
          }
        : null,
      isScheduled: true,
      dayType: DAY_TYPE[tipoDia],
      localDate: ahora.fecha,
      localTime: ahora.hora,
      timeZone: 'America/Bogota',
      scheduleUpdatedAt: isoBogota(rs.actualizadoEn),
      notice: AVISO,
      alerts: avisos.map((a) => ({
        id: a.id,
        type: a.tipo,
        reason: a.motivo,
        title: a.titulo,
        message: a.mensaje,
        scope: a.alcance,
        until: a.vigenteHasta,
      })),
    };

    // 1. Ruta fuera de servicio
    if (ruta.estado !== EstadoRuta.ACTIVA) {
      return { ...base, status: 'OUT_OF_SERVICE', message: 'La ruta está fuera de servicio.' };
    }

    // 2. Suspensión vigente (la de mayor prioridad viene primero en la lista)
    const suspension = avisos.find((a) => a.tipo === TipoAviso.SUSPENDIDO);
    if (suspension) {
      return {
        ...base,
        status: 'SUSPENDED',
        reason: suspension.motivo,
        message: suspension.titulo,
        detail: suspension.mensaje,
        suspendedUntil: suspension.vigenteHasta,
      };
    }

    // 3. Embarcadero cerrado temporalmente
    if (parada?.embarcadero.estado === EstadoEmbarcadero.CERRADO_TEMPORAL) {
      return {
        ...base,
        status: 'OUT_OF_SERVICE',
        message: `El ${parada.embarcadero.nombre} está cerrado temporalmente.`,
      };
    }

    // 4. Horario: salidas de hoy y de ayer (las de ayer pueden pasar hoy después de medianoche)
    const ayer = momentoEnBogota(new Date(instante.getTime() - UN_DIA_MS));
    const [horasHoy, horasAyer] = await Promise.all([
      this.horasDe(rs.id, tipoDia),
      this.horasDe(rs.id, await this.tipoDiaDe(ayer.fecha, ayer.diaSemana)),
    ]);
    const lugar = parada && parada.orden > 1 ? ` desde el ${parada.embarcadero.nombre}` : '';
    const proximo = buscarProximoPaso(horasHoy, horasAyer, desfase, ahora.minutos);

    if (proximo) {
      return {
        ...base,
        status: 'NEXT_DEPARTURE',
        departureTime: proximo.horaPaso,
        originDepartureTime: proximo.salidaOrigen,
        minutesRemaining: proximo.minutosRestantes,
        crossesMidnight: proximo.pasaDespuesDeMedianoche,
        message:
          proximo.minutosRestantes === 0
            ? `La embarcación ${lugar ? `pasa ahora por el ${parada!.embarcadero.nombre}` : 'sale ahora'} (${proximo.horaPaso}).`
            : `Próxima salida${lugar} a las ${proximo.horaPaso}, en ${proximo.minutosRestantes} min.`,
      };
    }

    const manana = momentoEnBogota(new Date(instante.getTime() + UN_DIA_MS));
    const tipoManana = await this.tipoDiaDe(manana.fecha, manana.diaSemana);
    const primeraManana = (await this.horasDe(rs.id, tipoManana))[0] ?? null;

    return {
      ...base,
      status: 'NO_MORE_DEPARTURES_TODAY',
      message:
        horasHoy.length === 0
          ? 'Esta ruta no tiene salidas programadas hoy.'
          : `No hay más salidas programadas hoy${lugar}.`,
      nextDayFirstDeparture: primeraManana
        ? {
            date: manana.fecha,
            dayType: DAY_TYPE[tipoManana],
            departureTime: sumarMinutos(primeraManana, desfase),
            originDepartureTime: primeraManana,
          }
        : null,
    };
  }

  private async tipoDiaDe(fecha: string, diaSemana: number): Promise<TipoDia> {
    return tipoDiaPara(diaSemana, await this.festivos.esFestivo(fecha));
  }

  private async horasDe(rutaSentidoId: string, tipoDia: TipoDia): Promise<string[]> {
    const lista = await this.horarios.find({
      where: { rutaSentidoId, tipoDia },
      order: { horaSalida: 'ASC' },
    });
    return lista.map((h) => formatoHora(h.horaSalida));
  }
}
