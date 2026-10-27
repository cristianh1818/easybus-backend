import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Horario } from '../horarios/entities/horario.entity.js';
import { RutasService } from '../rutas/rutas.service.js';
import { FestivosService } from '../horarios/festivos.service.js';
import { formatoHora } from '../horarios/horarios.service.js';
import { EstadoRuta, Sentido, TipoDia } from '../common/enums.js';
import {
  buscarProximaSalida,
  isoBogota,
  momentoEnBogota,
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

@Injectable()
export class ProximaSalidaService {
  constructor(
    @InjectRepository(Horario) private readonly horarios: Repository<Horario>,
    private readonly rutas: RutasService,
    private readonly festivos: FestivosService,
  ) {}

  // Sección 8.3: compara la hora actual de Montería con los horarios del sentido
  async calcular(rutaId: string, sentido: Sentido, instante: Date = new Date()) {
    const ruta = await this.rutas.buscarRuta(rutaId);
    const rs = await this.rutas.obtenerSentido(rutaId, sentido);

    const ahora = momentoEnBogota(instante);
    const tipoDia = await this.tipoDiaDe(ahora.fecha, ahora.diaSemana);

    const base = {
      route: { id: ruta.id, code: ruta.codigo, name: ruta.nombre },
      direction: sentido,
      destination: rs.destino,
      isScheduled: true,
      dayType: DAY_TYPE[tipoDia],
      localDate: ahora.fecha,
      localTime: ahora.hora,
      timeZone: 'America/Bogota',
      scheduleUpdatedAt: isoBogota(rs.actualizadoEn),
      notice: AVISO,
    };

    // Estado 3: ruta fuera de servicio
    if (ruta.estado !== EstadoRuta.ACTIVA) {
      return {
        ...base,
        status: 'OUT_OF_SERVICE',
        message: 'La ruta está fuera de servicio.',
      };
    }

    const horasHoy = await this.horasDe(rs.id, tipoDia);
    const proxima = buscarProximaSalida(horasHoy, ahora.minutos);

    // Estado 1: hay una próxima salida hoy
    if (proxima) {
      return {
        ...base,
        status: 'NEXT_DEPARTURE',
        departureTime: proxima.hora,
        minutesRemaining: proxima.minutosRestantes,
        message:
          proxima.minutosRestantes === 0
            ? `La embarcación sale ahora (${proxima.hora}).`
            : `Próxima salida a las ${proxima.hora}, en ${proxima.minutosRestantes} min.`,
      };
    }

    // Estado 2: no hay más salidas hoy -> se informa la primera de mañana
    const manana = momentoEnBogota(new Date(instante.getTime() + 24 * 60 * 60 * 1000));
    const tipoManana = await this.tipoDiaDe(manana.fecha, manana.diaSemana);
    const primeraManana = (await this.horasDe(rs.id, tipoManana))[0] ?? null;

    return {
      ...base,
      status: 'NO_MORE_DEPARTURES_TODAY',
      message:
        horasHoy.length === 0
          ? 'Esta ruta no tiene salidas programadas hoy.'
          : 'No hay más salidas programadas hoy.',
      nextDayFirstDeparture: primeraManana
        ? { date: manana.fecha, dayType: DAY_TYPE[tipoManana], departureTime: primeraManana }
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
